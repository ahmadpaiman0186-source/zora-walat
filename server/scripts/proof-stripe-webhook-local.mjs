/**
 * Local proof: signed `checkout.session.completed` through real `/webhooks/stripe`.
 *
 * Run: npm --prefix server run proof:stripe-webhook-local
 *
 * Requires: migrated DB (`TEST_DATABASE_URL` or `DATABASE_URL`). Preloads match integration chaos
 * (synthetic Stripe keys, mock airtime, inline fulfillment).
 *
 * Prints only safe fields (HTTP status, booleans, order suffix, counts). Exits non-zero on failure.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import request from 'supertest';

import { prisma } from '../src/db.js';
import { createApp } from '../src/app.js';
import { deleteLedgerJournalForPaymentCheckouts } from '../test/integrations/integrationLedgerTestCleanup.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';

const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
const dbUrl = String(process.env.DATABASE_URL ?? '').trim();

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof script contract
  console.log(JSON.stringify({ proof: 'stripe_webhook_local', ...obj }));
}

async function settle(ms = 2200) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!dbUrl) {
    proofLine({ ok: false, reason: 'DATABASE_URL_unset' });
    process.exit(1);
  }
  if (!webhookSecret.startsWith('whsec_')) {
    proofLine({ ok: false, reason: 'STRIPE_WEBHOOK_SECRET_invalid_or_missing' });
    process.exit(1);
  }

  const app = createApp();
  const user = await prisma.user.create({
    data: {
      email: `proof_wh_${randomUUID()}@test.invalid`,
      passwordHash: await bcrypt.hash('x', 4),
    },
  });
  const order = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      userId: user.id,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      orderStatus: ORDER_STATUS.PENDING,
      amountUsdCents: 1000,
      currency: 'usd',
      senderCountryCode: 'US',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      productType: 'mobile_topup',
      providerCostUsdCents: 800,
      stripeFeeEstimateUsdCents: 59,
      fxBufferUsdCents: 0,
      riskBufferUsdCents: 0,
      projectedNetMarginBp: 400,
      financialAnomalyCodes: [FINANCIAL_ANOMALY.LOW_MARGIN],
    },
  });

  const piId = `pi_proof_${randomUUID().slice(0, 8)}`;
  const sessionPayload = {
    id: `cs_proof_${randomUUID().slice(0, 8)}`,
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: 1000,
    currency: 'usd',
    payment_intent: piId,
    customer: 'cus_proof_test',
    metadata: { internalCheckoutId: order.id },
  };
  const eventId = `evt_proof_local_${randomUUID().slice(0, 8)}`;

  function buildSignedPost() {
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: sessionPayload },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    return request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(payload);
  }

  const r1 = await buildSignedPost();
  assert.equal(r1.status, 200);
  assert.equal(r1.body?.received, true);
  await settle();

  const r2 = await buildSignedPost();
  assert.equal(r2.status, 200);
  assert.equal(r2.body?.received, true);
  await settle();

  const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
  const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
  assert.ok(
    row?.orderStatus === ORDER_STATUS.PAID || row?.orderStatus === ORDER_STATUS.FULFILLED,
    `expected PAID or FULFILLED, got ${row?.orderStatus}`,
  );
  assert.equal(nAtt, 1);

  const badPayload = JSON.stringify({
    id: `evt_proof_local_bad_${randomUUID().slice(0, 8)}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { ...sessionPayload, metadata: { internalCheckoutId: order.id } } },
  });
  const badHeader = Stripe.webhooks.generateTestHeaderString({
    payload: badPayload,
    secret: `whsec_${'n'.repeat(32)}`,
  });
  const rBad = await request(app)
    .post('/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', badHeader)
    .send(badPayload);
  assert.equal(rBad.status, 400);

  const rowAfterBad = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
  const nAttAfterBad = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
  assert.equal(rowAfterBad?.orderStatus, row?.orderStatus);
  assert.equal(nAttAfterBad, 1);

  proofLine({
    ok: true,
    firstSignedPostHttp: r1.status,
    secondSignedPostHttp: r2.status,
    duplicateIgnored: true,
    invalidSignatureHttp: rBad.status,
    invalidSignatureRejected: rBad.status === 400,
    paymentOrderStatus: row?.orderStatus ?? null,
    fulfillmentAttemptCount: nAttAfterBad,
    orderIdSuffix: String(order.id).slice(-12),
  });

  /**
   * Teardown: `LedgerJournalEntry` is append-only (DB triggers; FK RESTRICT to PaymentCheckout +
   * FulfillmentAttempt). {@link deleteLedgerJournalForPaymentCheckouts} is intentionally a no-op.
   * Do **not** delete FulfillmentAttempt / PaymentCheckout / User — mirror Sprint 4 integration teardown.
   * Safe cleanup only (CI disposable Postgres job DB + unique proof IDs).
   */
  await deleteLedgerJournalForPaymentCheckouts(prisma, [order.id]);
  await prisma.loyaltyPointsGrant.deleteMany({ where: { paymentCheckoutId: order.id } });
  await prisma.loyaltyLedger.deleteMany({ where: { userId: user.id } });
  await prisma.stripeWebhookEvent.deleteMany({
    where: { id: { startsWith: 'evt_proof_local_' } },
  });
}

(async () => {
  try {
    await main();
    process.exitCode = 0;
  } catch (err) {
    proofLine({
      ok: false,
      error: typeof err?.message === 'string' ? err.message.slice(0, 200) : String(err),
    });
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    process.exit(process.exitCode ?? 0);
  }
})();
