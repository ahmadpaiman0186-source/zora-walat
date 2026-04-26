/**
 * Local execution proof: WebTopup create → PaymentIntent → confirm (test card) →
 * optional mark-paid → DB verification → mock fulfillment dispatch.
 *
 * Requires: API on http://127.0.0.1:8787, DATABASE_URL, STRIPE_SECRET_KEY in server/.env
 * (bootstrap loads it). For live webhooks, run Stripe CLI listen with STRIPE_WEBHOOK_SECRET
 * matching the active session.
 *
 * Usage (from server/): node scripts/local-webtopup-money-path-proof.mjs
 */
import { randomUUID } from 'node:crypto';

import '../bootstrap.js';
import Stripe from 'stripe';
import { prisma } from '../src/db.js';
import { dispatchWebTopupFulfillment } from '../src/services/topupFulfillment/webTopupFulfillmentService.js';
import {
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
} from '../src/domain/topupOrder/statuses.js';

const API = 'http://127.0.0.1:8787';

const scriptLog = {
  info(o, msg) {
    console.error(JSON.stringify({ level: 'info', msg, ...o }));
  },
  warn(o, msg) {
    console.error(JSON.stringify({ level: 'warn', msg, ...o }));
  },
};

function topupBody() {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  return {
    originCountry: 'US',
    destinationCountry: 'AF',
    productType: 'airtime',
    operatorKey: 'mtn-af',
    operatorLabel: 'MTN Afghanistan',
    phoneNumber: `7012345${suffix}`.slice(0, 15),
    productId: 'pkg_smoke',
    productName: 'Smoke',
    selectedAmountLabel: '$5',
    amountCents: 500,
    currency: 'usd',
  };
}

async function main() {
  const sk = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!sk.startsWith('sk_test_')) {
    throw new Error('STRIPE_SECRET_KEY must be sk_test_ for this proof');
  }
  const stripe = new Stripe(sk);

  const idemOrder = randomUUID();
  const createRes = await fetch(`${API}/api/topup-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idemOrder,
    },
    body: JSON.stringify(topupBody()),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(
      `topup-orders failed: ${createRes.status} ${JSON.stringify(createJson)}`,
    );
  }
  const orderId = createJson?.order?.id;
  const sessionKey = createJson?.sessionKey;
  const updateToken = createJson?.updateToken;
  if (!orderId || !sessionKey || !updateToken) {
    throw new Error(`unexpected create body: ${JSON.stringify(createJson)}`);
  }

  const idemPi = randomUUID();
  const piRes = await fetch(`${API}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idemPi,
      'X-ZW-WebTopup-Session': sessionKey,
    },
    body: JSON.stringify({ amount: 500, orderId }),
  });
  const piJson = await piRes.json().catch(() => ({}));
  if (!piRes.ok) {
    throw new Error(
      `create-payment-intent failed: ${piRes.status} ${JSON.stringify(piJson)}`,
    );
  }
  const paymentIntentId = piJson?.paymentIntentId;
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new Error(`missing paymentIntentId: ${JSON.stringify(piJson)}`);
  }

  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: 'pm_card_visa',
    return_url: 'http://127.0.0.1:3000/',
  });

  console.log(
    JSON.stringify(
      {
        phase: 'stripe_confirm',
        paymentIntentId,
        status: confirmed.status,
        orderIdSuffix: orderId.slice(-8),
      },
      null,
      2,
    ),
  );

  await new Promise((r) => setTimeout(r, 2500));

  const markPaidRes = await fetch(
    `${API}/api/topup-orders/${encodeURIComponent(orderId)}/mark-paid`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updateToken,
        paymentIntentId,
        sessionKey,
      }),
    },
  );
  const markPaidJson = await markPaidRes.json().catch(() => ({}));

  const row = await prisma.webTopupOrder.findUnique({
    where: { id: orderId },
    select: {
      paymentStatus: true,
      fulfillmentStatus: true,
      paymentIntentId: true,
      completedByStripeEventId: true,
    },
  });

  const recentWebhookRows = await prisma.stripeWebhookEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 5,
    select: { id: true, receivedAt: true },
  });

  const diag = await dispatchWebTopupFulfillment(orderId, scriptLog, {});

  const rowAfter = await prisma.webTopupOrder.findUnique({
    where: { id: orderId },
    select: {
      paymentStatus: true,
      fulfillmentStatus: true,
      fulfillmentProvider: true,
      fulfillmentReference: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        phase: 'summary',
        markPaidHttp: markPaidRes.status,
        markPaidReplayHint: markPaidJson?.order?.paymentStatus,
        orderDb: row,
        orderAfterFulfillment: rowAfter,
        fulfillmentDiagnostics: diag,
        stripeWebhookEventsRecentSample: recentWebhookRows,
        webhookNote:
          row?.completedByStripeEventId
            ? 'completedByStripeEventId set — webhook handler likely ran (verify with stripe listen logs).'
            : 'completedByStripeEventId null — webhook may not have reached this API (start stripe listen + matching STRIPE_WEBHOOK_SECRET) or client path marked paid first.',
      },
      null,
      2,
    ),
  );

  const okPay =
    row?.paymentStatus === PAYMENT_STATUS.PAID &&
    confirmed.status === 'succeeded';
  const okFulfill = rowAfter?.fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED;

  if (!okPay) {
    throw new Error('payment not in expected PAID state');
  }
  if (!okFulfill) {
    throw new Error(
      `fulfillment expected delivered, got ${rowAfter?.fulfillmentStatus ?? 'unknown'}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
