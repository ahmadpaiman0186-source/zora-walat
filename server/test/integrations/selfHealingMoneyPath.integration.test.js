/**
 * L8 self-healing repairs — PostgreSQL integration (append-only ledger respected).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after } from 'node:test';
import bcrypt from 'bcrypt';

import { prisma } from '../../src/db.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { LEDGER_EVENT_TYPE } from '../../src/ledger/ledgerService.js';
import {
  applySafeMoneyPathRepair,
  repairLedgerMissingPaymentCapture,
} from '../../src/selfHealing/moneyPathDriftRepair.js';
import { DRIFT_TYPE } from '../../src/selfHealing/moneyPathDriftScan.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL');
}

const runIntegration = Boolean(String(process.env.DATABASE_URL ?? '').trim());

describe('L8 self-healing money path (integration)', { skip: !runIntegration }, () => {
  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('repair: missing PAYMENT_CAPTURED ledger uses idempotent post (duplicate second pass)', async () => {
    const u = await prisma.user.create({
      data: {
        email: `sh_ledger_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });

    const eventId = `evt_sh_${randomUUID().slice(0, 16)}`;
    await prisma.stripeWebhookEvent.create({ data: { id: eventId } });

    const row = await prisma.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId: u.id,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        orderStatus: ORDER_STATUS.PAID,
        amountUsdCents: 1500,
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
        paidAt: new Date(),
        stripePaymentIntentId: `pi_sh_${randomUUID().slice(0, 12)}`,
        completedByWebhookEventId: eventId,
      },
    });

    const idem = `ledger:payment:${row.id}:${eventId}`;

    const inc = {
      type: DRIFT_TYPE.LEDGER_DRIFT,
      subtype: 'missing_payment_capture_for_paid',
      checkoutId: row.id,
      traceId: /** @type {string | null} */ (null),
    };

    const rFirst = await repairLedgerMissingPaymentCapture(
      prisma,
      inc,
      `trace-sh-${randomUUID().slice(0, 8)}`,
    );
    assert.equal(rFirst.result, 'appended');

    const entry = await prisma.ledgerJournalEntry.findUnique({
      where: { idempotencyKey: idem },
    });
    assert.ok(entry);
    assert.equal(entry.eventType, LEDGER_EVENT_TYPE.PAYMENT_CAPTURED);

    const r2 = await repairLedgerMissingPaymentCapture(
      prisma,
      {
        type: DRIFT_TYPE.LEDGER_DRIFT,
        subtype: 'missing_payment_capture_for_paid',
        checkoutId: row.id,
        traceId: null,
      },
      `trace-sh2-${randomUUID().slice(0, 8)}`,
    );
    assert.equal(r2.result, 'duplicate_noop');

    const entries = await prisma.ledgerJournalEntry.count({
      where: { idempotencyKey: idem },
    });
    assert.equal(entries, 1);
  });

  it('repair: paid without fulfillment enqueues via injected queue (duplicate = deduped)', async () => {
    const u = await prisma.user.create({
      data: {
        email: `sh_ff_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });

    const eventId = `evt_sh_ff_${randomUUID().slice(0, 16)}`;
    await prisma.stripeWebhookEvent.create({ data: { id: eventId } });

    const row = await prisma.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId: u.id,
        metadata: { zwTraceId: `zw_${randomUUID().slice(0, 8)}` },
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        orderStatus: ORDER_STATUS.PAID,
        amountUsdCents: 900,
        currency: 'usd',
        senderCountryCode: 'US',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        productType: 'mobile_topup',
        providerCostUsdCents: 700,
        stripeFeeEstimateUsdCents: 40,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
        projectedNetMarginBp: 400,
        paidAt: new Date(),
        stripePaymentIntentId: `pi_sh_ff_${randomUUID().slice(0, 12)}`,
        completedByWebhookEventId: eventId,
      },
    });

    let calls = 0;
    const enqueueFn = async () => {
      calls += 1;
      return {
        ok: true,
        jobId: row.id,
        deduped: calls > 1,
      };
    };

    const inc = {
      type: DRIFT_TYPE.FULFILLMENT_DRIFT,
      subtype: 'paid_without_fulfillment_attempt',
      checkoutId: row.id,
      traceId: /** @type {string | null} */ (null),
    };

    const a1 = await applySafeMoneyPathRepair({
      prisma,
      inconsistency: inc,
      traceId: `tr-${randomUUID().slice(0, 8)}`,
      deps: { enqueueFn },
    });
    assert.equal(a1.result, 'enqueued');

    const a2 = await applySafeMoneyPathRepair({
      prisma,
      inconsistency: inc,
      traceId: `tr-${randomUUID().slice(0, 8)}`,
      deps: { enqueueFn },
    });
    assert.equal(a2.result, 'deduped_noop');
    assert.equal(calls, 2);
  });
});
