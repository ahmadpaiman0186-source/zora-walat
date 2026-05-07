/**
 * L4 ledger: balance rules, idempotency, payment + fulfillment posting gates.
 * DB-backed cases require migrated schema + `DATABASE_URL` (same as other server tests).
 */
import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

import { prisma } from '../src/db.js';
import { LEDGER_ACCOUNT_CODE } from '../src/constants/ledgerAccountCodes.js';
import {
  assertBalanced,
  allocateFulfillmentRecognitionCents,
  getLedgerEntryByIdempotencyKey,
  postLedgerEntry,
  postPaymentCapturedLedger,
  postFulfillmentRevenueLedger,
} from '../src/ledger/ledgerService.js';
import { runInRollbackTxn } from './helpers/dbTxn.js';

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runDb = Boolean(dbUrl);

async function ledgerTablesReachable() {
  if (!runDb) return false;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "LedgerAccount" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

describe('assertBalanced', () => {
  it('rejects debit !== credit', () => {
    assert.throws(
      () =>
        assertBalanced([
          { accountCode: 'X', debitCents: 100, creditCents: 0 },
          { accountCode: 'Y', debitCents: 0, creditCents: 99 },
        ]),
      /ledger_unbalanced/,
    );
  });

  it('rejects negative amounts', () => {
    assert.throws(
      () =>
        assertBalanced([
          { accountCode: 'X', debitCents: -1, creditCents: 0 },
          { accountCode: 'Y', debitCents: 0, creditCents: 1 },
        ]),
      /negative_amount/,
    );
  });

  it('accepts balanced two-line entry', () => {
    assertBalanced([
      { accountCode: 'A', debitCents: 500, creditCents: 0 },
      { accountCode: 'B', debitCents: 0, creditCents: 500 },
    ]);
  });
});

describe('allocateFulfillmentRecognitionCents', () => {
  it('caps fee and provider so components sum to sell', () => {
    const r = allocateFulfillmentRecognitionCents(1000, 900, 900);
    assert.equal(r.sellUsdCents, 1000);
    assert.equal(r.feeCents + r.providerCents + r.netCents, 1000);
    assert.ok(r.feeCents >= 0 && r.providerCents >= 0 && r.netCents >= 0);
  });
});

describe('postFulfillmentRevenueLedger (not webhook-paid)', () => {
  let tablesOk = false;

  before(async () => {
    tablesOk = await ledgerTablesReachable();
  });

  it('skips when completedByWebhookEventId missing', async () => {
    if (!tablesOk) return;
    const r = await prisma.$transaction(async (tx) =>
      postFulfillmentRevenueLedger(tx, {
        orderId: 'cm' + 'x'.repeat(23),
        attemptId: 'fa_test',
        completedByWebhookEventId: null,
        snapshot: {
          marginSellUsdCents: 1000,
          marginPaymentFeeUsdCents: 50,
          marginProviderCostUsdCents: 800,
        },
      }),
    );
    assert.equal(r.skipped, true);
    assert.equal(r.reason, 'not_webhook_paid');
  });
});

describe('L4 ledger DB integration', { skip: !runDb }, () => {
  let tablesOk = false;

  before(async () => {
    tablesOk = await ledgerTablesReachable();
  });

  it('same idempotency key does not duplicate', async () => {
    if (!tablesOk) return;
    await runInRollbackTxn(async (tx) => {
      const key = `ledger:test:${randomUUID()}`;
      const r1 = await postLedgerEntry(tx, {
        idempotencyKey: key,
        eventType: 'TEST',
        lines: [
          {
            accountCode: LEDGER_ACCOUNT_CODE.ASSET_CASH_STRIPE,
            debitCents: 10,
            creditCents: 0,
          },
          {
            accountCode: LEDGER_ACCOUNT_CODE.LIABILITY_CUSTOMER,
            debitCents: 0,
            creditCents: 10,
          },
        ],
      });
      assert.equal(r1.duplicate, false);

      const r2 = await postLedgerEntry(tx, {
        idempotencyKey: key,
        eventType: 'TEST',
        lines: [
          {
            accountCode: LEDGER_ACCOUNT_CODE.ASSET_CASH_STRIPE,
            debitCents: 999,
            creditCents: 0,
          },
          {
            accountCode: LEDGER_ACCOUNT_CODE.LIABILITY_CUSTOMER,
            debitCents: 0,
            creditCents: 999,
          },
        ],
      });
      assert.equal(r2.duplicate, true);
      assert.equal(r2.entryId, r1.entryId);

      const row = await tx.ledgerJournalEntry.findUnique({
        where: { idempotencyKey: key },
        include: { lines: true },
      });
      assert.equal(row?.lines.length, 2);
      const sumD = row.lines.reduce((s, L) => s + L.debitCents, 0);
      const sumC = row.lines.reduce((s, L) => s + L.creditCents, 0);
      assert.equal(sumD, sumC);
      assert.equal(sumD, 10);
    });
  });

  it('payment capture ledger idempotent on same checkout + stripe event', async () => {
    if (!tablesOk) return;
    await runInRollbackTxn(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: `ledger_pay_${randomUUID()}@t.invalid`,
          passwordHash: await bcrypt.hash('x', 4),
        },
      });
      const webhookEvt = `evt_test_ledger_pay_${randomUUID().slice(0, 8)}`;
      const o = await tx.paymentCheckout.create({
        data: {
          idempotencyKey: randomUUID(),
          requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
          userId: u.id,
          status: 'PAYMENT_SUCCEEDED',
          orderStatus: 'PAID',
          amountUsdCents: 2000,
          completedByWebhookEventId: webhookEvt,
          currency: 'usd',
          senderCountryCode: 'US',
          operatorKey: 'mtn',
          recipientNational: '701234567',
          productType: 'mobile_topup',
          providerCostUsdCents: 1500,
          stripeFeeEstimateUsdCents: 59,
          fxBufferUsdCents: 0,
          riskBufferUsdCents: 0,
          projectedNetMarginBp: 400,
          financialAnomalyCodes: [],
        },
      });
      const evt = `evt_test_ledger_dup_${randomUUID().slice(0, 8)}`;
      const k = `ledger:payment:${o.id}:${evt}`;

      const a = await postPaymentCapturedLedger(tx, {
        checkoutId: o.id,
        stripeEventId: evt,
        amountUsdCents: 2000,
      });
      assert.equal(a.duplicate, false);
      const b = await postPaymentCapturedLedger(tx, {
        checkoutId: o.id,
        stripeEventId: evt,
        amountUsdCents: 2000,
      });
      assert.equal(b.duplicate, true);

      const n = await tx.ledgerJournalEntry.count({
        where: { idempotencyKey: k },
      });
      assert.equal(n, 1);
    });
  });

  it('fulfillment ledger requires webhook-paid correlation', async () => {
    if (!tablesOk) return;
    await runInRollbackTxn(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: `ledger_ff_${randomUUID()}@t.invalid`,
          passwordHash: await bcrypt.hash('x', 4),
        },
      });
      const o = await tx.paymentCheckout.create({
        data: {
          idempotencyKey: randomUUID(),
          requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
          userId: u.id,
          status: 'RECHARGE_PENDING',
          orderStatus: 'PROCESSING',
          amountUsdCents: 1500,
          currency: 'usd',
          senderCountryCode: 'US',
          operatorKey: 'mtn',
          recipientNational: '701234567',
          productType: 'mobile_topup',
          providerCostUsdCents: 1000,
          stripeFeeEstimateUsdCents: 50,
          fxBufferUsdCents: 0,
          riskBufferUsdCents: 0,
          projectedNetMarginBp: 400,
          financialAnomalyCodes: [],
          completedByWebhookEventId: null,
        },
      });
      const att = await tx.fulfillmentAttempt.create({
        data: {
          orderId: o.id,
          status: 'SUCCEEDED',
          attemptNumber: 1,
          provider: 'mock',
        },
      });
      const r = await postFulfillmentRevenueLedger(tx, {
        orderId: o.id,
        attemptId: att.id,
        completedByWebhookEventId: o.completedByWebhookEventId,
        snapshot: {
          marginSellUsdCents: 1500,
          marginPaymentFeeUsdCents: 50,
          marginProviderCostUsdCents: 1000,
        },
      });
      assert.equal(r.skipped, true);
      const fk = `ledger:fulfillment:${o.id}:${att.id}`;
      const ex = await tx.ledgerJournalEntry.findUnique({
        where: { idempotencyKey: fk },
      });
      assert.equal(ex, null);
    });
  });

  it('getLedgerEntryByIdempotencyKey returns lines', async () => {
    if (!tablesOk) return;
    await runInRollbackTxn(async (tx) => {
      const key = `ledger:test:get:${randomUUID()}`;
      await postLedgerEntry(tx, {
        idempotencyKey: key,
        eventType: 'TEST_GET',
        lines: [
          {
            accountCode: LEDGER_ACCOUNT_CODE.ASSET_CASH_STRIPE,
            debitCents: 3,
            creditCents: 0,
          },
          {
            accountCode: LEDGER_ACCOUNT_CODE.LIABILITY_CUSTOMER,
            debitCents: 0,
            creditCents: 3,
          },
        ],
      });
      const g = await getLedgerEntryByIdempotencyKey(tx, key);
      assert.ok(g?.lines?.length === 2);
    });
  });
});
