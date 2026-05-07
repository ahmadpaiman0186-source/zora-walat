/**
 * L4 ledger local proof (DB + balance + idempotency). No Stripe charges / no Reloadly.
 * Run: npm --prefix server run proof:ledger-local
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

import { prisma } from '../src/db.js';
import { LEDGER_ACCOUNT_CODE } from '../src/constants/ledgerAccountCodes.js';
import {
  assertBalanced,
  postLedgerEntry,
  postPaymentCapturedLedger,
  postFulfillmentRevenueLedger,
} from '../src/ledger/ledgerService.js';
import { runInRollbackTxn } from '../test/helpers/dbTxn.js';

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();

const out = {
  ok: false,
  balanced: false,
  paymentLedgerCreated: false,
  duplicateLedgerPrevented: false,
  fulfillmentLedgerCreated: false,
  notes: [],
};

async function main() {
  if (!dbUrl) {
    out.notes.push('DATABASE_URL unset');
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  try {
    await prisma.$queryRaw`SELECT 1 FROM "LedgerAccount" LIMIT 1`;
  } catch {
    out.notes.push('LedgerAccount table missing — run prisma migrate deploy');
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  let sd = 0;
  let sc = 0;
  await runInRollbackTxn(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: `proof_ledger_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });

    const order = await tx.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId: u.id,
        status: 'PAYMENT_SUCCEEDED',
        orderStatus: 'PAID',
        amountUsdCents: 500,
        completedByWebhookEventId: `evt_proof_ledger_${randomUUID().slice(0, 8)}`,
        currency: 'usd',
        senderCountryCode: 'US',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        productType: 'mobile_topup',
        providerCostUsdCents: 400,
        stripeFeeEstimateUsdCents: 30,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
        projectedNetMarginBp: 400,
        financialAnomalyCodes: [],
      },
    });

    const evt = `evt_proof_ledger_${randomUUID().slice(0, 10)}`;
    const payKey = `ledger:payment:${order.id}:${evt}`;

  try {
    assertBalanced([
      { accountCode: LEDGER_ACCOUNT_CODE.ASSET_CASH_STRIPE, debitCents: 1, creditCents: 0 },
      { accountCode: LEDGER_ACCOUNT_CODE.LIABILITY_CUSTOMER, debitCents: 0, creditCents: 1 },
    ]);
    out.balanced = true;
  } catch {
    out.notes.push('assertBalanced sanity failed');
  }

    const a = await postPaymentCapturedLedger(tx, {
      checkoutId: order.id,
      stripeEventId: evt,
      amountUsdCents: 500,
    });
    const b = await postPaymentCapturedLedger(tx, {
      checkoutId: order.id,
      stripeEventId: evt,
      amountUsdCents: 500,
    });
    out.paymentLedgerCreated = a.duplicate === false;
    out.duplicateLedgerPrevented =
      b.duplicate === true && b.entryId === a.entryId;

    const att = await tx.fulfillmentAttempt.create({
      data: {
        orderId: order.id,
        status: 'SUCCEEDED',
        attemptNumber: 1,
        provider: 'mock',
      },
    });

    const f = await postFulfillmentRevenueLedger(tx, {
      orderId: order.id,
      attemptId: att.id,
      completedByWebhookEventId: order.completedByWebhookEventId,
      snapshot: {
        marginSellUsdCents: 500,
        marginPaymentFeeUsdCents: 30,
        marginProviderCostUsdCents: 400,
      },
    });
    out.fulfillmentLedgerCreated = f.duplicate === false;

    const dupFul = await postFulfillmentRevenueLedger(tx, {
      orderId: order.id,
      attemptId: att.id,
      completedByWebhookEventId: order.completedByWebhookEventId,
      snapshot: {
        marginSellUsdCents: 500,
        marginPaymentFeeUsdCents: 30,
        marginProviderCostUsdCents: 400,
      },
    });
    out.duplicateLedgerPrevented =
      out.duplicateLedgerPrevented && dupFul.duplicate === true;

    const fk = `ledger:fulfillment:${order.id}:${att.id}`;
    const lines = await tx.ledgerJournalLine.findMany({
      where: { entry: { idempotencyKey: fk } },
    });
    sd = lines.reduce((s, L) => s + L.debitCents, 0);
    sc = lines.reduce((s, L) => s + L.creditCents, 0);
    if (sd !== sc) {
      out.notes.push(`fulfillment_lines_unbalanced:${sd}!=${sc}`);
    }

    const entries = await tx.ledgerJournalEntry.count({
      where: { OR: [{ idempotencyKey: payKey }, { idempotencyKey: fk }] },
    });
    if (entries < 2) {
      out.notes.push(`ledger_entries_missing:${entries}`);
    }
  });

  out.ok =
    out.balanced &&
    out.paymentLedgerCreated &&
    out.duplicateLedgerPrevented &&
    out.fulfillmentLedgerCreated &&
    sd === sc;

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

main().catch((e) => {
  out.notes.push(String(e?.message ?? e).slice(0, 200));
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
});
