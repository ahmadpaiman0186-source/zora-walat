/**
 * L4 double-entry ledger: append-only journal entries + lines (fail-closed balance).
 * @see prisma `LedgerAccount`, `LedgerJournalEntry`, `LedgerJournalLine` (distinct from legacy `LedgerEntry`).
 */

import { LEDGER_ACCOUNT_CODE } from '../constants/ledgerAccountCodes.js';
import { getTraceId } from '../lib/requestContext.js';
import { emitL7MoneyPathSpan } from '../infrastructure/logging/l7MoneyPathObservability.js';

export const LEDGER_EVENT_TYPE = Object.freeze({
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  FULFILLMENT_RECOGNIZED: 'FULFILLMENT_RECOGNIZED',
});

/**
 * @param {{ debitCents?: unknown, creditCents?: unknown, accountCode?: string }[]} lines
 * @returns {void}
 */
export function assertBalanced(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('ledger_unbalanced: need at least two lines');
  }
  let d = 0;
  let c = 0;
  for (const L of lines) {
    const dc = Math.floor(Number(L.debitCents) || 0);
    const cc = Math.floor(Number(L.creditCents) || 0);
    if (dc < 0 || cc < 0) {
      throw new Error('ledger_unbalanced: negative_amount');
    }
    if (dc > 0 && cc > 0) {
      throw new Error('ledger_unbalanced: line_has_both_sides');
    }
    if (dc === 0 && cc === 0) {
      throw new Error('ledger_unbalanced: empty_line');
    }
    d += dc;
    c += cc;
  }
  if (d !== c) {
    const err = new Error(`ledger_unbalanced: debit ${d} !== credit ${c}`);
    err.code = 'LEDGER_UNBALANCED';
    throw err;
  }
}

/**
 * Allocate fee + provider + net from sell with non-negative integers summing to `sell`.
 *
 * @param {number} sellUsdCents
 * @param {number} paymentFeeUsdCents
 * @param {number} providerCostUsdCents
 */
export function allocateFulfillmentRecognitionCents(
  sellUsdCents,
  paymentFeeUsdCents,
  providerCostUsdCents,
) {
  const s = Math.max(0, Math.floor(Number(sellUsdCents) || 0));
  let f = Math.max(0, Math.floor(Number(paymentFeeUsdCents) || 0));
  let p = Math.max(0, Math.floor(Number(providerCostUsdCents) || 0));
  if (f > s) f = s;
  p = Math.min(p, s - f);
  const net = s - f - p;
  return { sellUsdCents: s, feeCents: f, providerCents: p, netCents: net };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} key
 */
export async function getLedgerEntryByIdempotencyKey(tx, key) {
  const k = String(key ?? '').trim();
  if (!k) return null;
  return tx.ledgerJournalEntry.findUnique({
    where: { idempotencyKey: k },
    include: { lines: { include: { account: true } } },
  });
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{
 *   idempotencyKey: string,
 *   paymentCheckoutId?: string | null,
 *   fulfillmentAttemptId?: string | null,
 *   eventType: string,
 *   lines: { accountCode: string, debitCents: number, creditCents: number, memo?: string }[],
 *   metadataJson?: import('@prisma/client').Prisma.InputJsonValue | null,
 * }} payload
 * @returns {Promise<{ duplicate: boolean, entryId: string }>}
 */
/**
 * Test-only: force failure after `LedgerJournalEntry` header insert so the outer webhook txn rolls back.
 * Gated: NODE_ENV=test and env matches payload.paymentCheckoutId (never set in production/runtime).
 *
 * @param {string | null | undefined} paymentCheckoutId
 */
function maybeZwTestThrowLedgerJournalMidWrite(paymentCheckoutId) {
  if (process.env.NODE_ENV !== 'test') return;
  const target = String(process.env.ZW_TEST_INJECT_LEDGER_POST_THROW ?? '').trim();
  const cid =
    paymentCheckoutId != null ? String(paymentCheckoutId).trim() : '';
  if (!target || !cid || target !== cid) return;
  const err = new Error('zw_test_ledger_journal_mid_write_injection');
  err.code = 'ZW_TEST_LEDGER_POST_INJECTION';
  throw err;
}

export async function postLedgerEntry(tx, payload) {
  const idem = String(payload.idempotencyKey ?? '').trim();
  if (!idem) {
    throw new Error('ledger_missing_idempotency_key');
  }

  const existing = await getLedgerEntryByIdempotencyKey(tx, idem);
  if (existing) {
    return { duplicate: true, entryId: existing.id };
  }

  assertBalanced(payload.lines);

  const codes = [...new Set(payload.lines.map((l) => String(l.accountCode)))];
  const accounts = await tx.ledgerAccount.findMany({
    where: { code: { in: codes } },
  });
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  for (const code of codes) {
    if (!byCode.has(code)) {
      throw new Error(`ledger_unknown_account:${code}`);
    }
  }

  const entry = await tx.ledgerJournalEntry.create({
    data: {
      idempotencyKey: idem,
      paymentCheckoutId: payload.paymentCheckoutId ?? null,
      fulfillmentAttemptId: payload.fulfillmentAttemptId ?? null,
      eventType: String(payload.eventType),
      metadataJson: payload.metadataJson ?? undefined,
    },
  });

  maybeZwTestThrowLedgerJournalMidWrite(payload.paymentCheckoutId ?? null);

  for (const L of payload.lines) {
    const acc = byCode.get(String(L.accountCode));
    if (!acc) throw new Error(`ledger_unknown_account:${L.accountCode}`);
    await tx.ledgerJournalLine.create({
      data: {
        entryId: entry.id,
        accountId: acc.id,
        debitCents: Math.floor(Number(L.debitCents) || 0),
        creditCents: Math.floor(Number(L.creditCents) || 0),
        memo: L.memo != null ? String(L.memo).slice(0, 512) : null,
      },
    });
  }

  emitL7MoneyPathSpan({
    surface: 'ledger',
    stage: 'journal_entry_appended',
    outcome: 'ok',
    traceId: getTraceId() ?? null,
    refs: {
      entryIdSuffix: entry.id.length >= 12 ? entry.id.slice(-12) : entry.id,
      eventType: String(payload.eventType),
      lineCount: payload.lines.length,
      idempotencyKeySuffix:
        idem.length >= 16 ? idem.slice(-16) : idem.slice(0, 8),
    },
  });

  return { duplicate: false, entryId: entry.id };
}

/**
 * Stripe webhook PAID: cash in vs customer liability (gross).
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ checkoutId: string, stripeEventId: string, amountUsdCents: number }} p
 */
export async function postPaymentCapturedLedger(tx, p) {
  const amount = Math.max(0, Math.floor(Number(p.amountUsdCents) || 0));
  if (amount <= 0) return { skipped: true, reason: 'zero_amount' };
  const idem = `ledger:payment:${p.checkoutId}:${p.stripeEventId}`;
  return postLedgerEntry(tx, {
    idempotencyKey: idem,
    paymentCheckoutId: p.checkoutId,
    eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED,
    metadataJson: { checkoutId: p.checkoutId, stripeEventId: p.stripeEventId },
    lines: [
      {
        accountCode: LEDGER_ACCOUNT_CODE.ASSET_CASH_STRIPE,
        debitCents: amount,
        creditCents: 0,
        memo: 'stripe_checkout_paid_gross',
      },
      {
        accountCode: LEDGER_ACCOUNT_CODE.LIABILITY_CUSTOMER,
        debitCents: 0,
        creditCents: amount,
        memo: 'customer_obligation',
      },
    ],
  });
}

/**
 * Fulfillment success: recognize revenue / clearing vs customer liability (requires prior webhook PAID).
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{
 *   orderId: string,
 *   attemptId: string,
 *   completedByWebhookEventId: string | null,
 *   snapshot: { marginSellUsdCents: number, marginPaymentFeeUsdCents: number, marginProviderCostUsdCents: number },
 * }} p
 */
export async function postFulfillmentRevenueLedger(tx, p) {
  if (!p.completedByWebhookEventId || String(p.completedByWebhookEventId).trim() === '') {
    return { skipped: true, reason: 'not_webhook_paid' };
  }
  const idem = `ledger:fulfillment:${p.orderId}:${p.attemptId}`;
  const { sellUsdCents, feeCents, providerCents, netCents } = allocateFulfillmentRecognitionCents(
    p.snapshot.marginSellUsdCents,
    p.snapshot.marginPaymentFeeUsdCents,
    p.snapshot.marginProviderCostUsdCents,
  );
  if (sellUsdCents <= 0) {
    return { skipped: true, reason: 'zero_sell' };
  }

  /** @type {{ accountCode: string, debitCents: number, creditCents: number, memo?: string }[]} */
  const lines = [
    {
      accountCode: LEDGER_ACCOUNT_CODE.LIABILITY_CUSTOMER,
      debitCents: sellUsdCents,
      creditCents: 0,
      memo: 'release_customer_obligation_on_delivery',
    },
  ];
  if (feeCents > 0) {
    lines.push({
      accountCode: LEDGER_ACCOUNT_CODE.REVENUE_SERVICE_FEE,
      debitCents: 0,
      creditCents: feeCents,
      memo: 'payment_processing_fee_component',
    });
  }
  if (providerCents > 0) {
    lines.push({
      accountCode: LEDGER_ACCOUNT_CODE.CLEARING_PROVIDER,
      debitCents: 0,
      creditCents: providerCents,
      memo: 'provider_corridor_clearing',
    });
  }
  if (netCents > 0) {
    lines.push({
      accountCode: LEDGER_ACCOUNT_CODE.REVENUE_PLATFORM_NET,
      debitCents: 0,
      creditCents: netCents,
      memo: 'platform_net_after_fee_and_provider',
    });
  }

  assertBalanced(lines);

  return postLedgerEntry(tx, {
    idempotencyKey: idem,
    paymentCheckoutId: p.orderId,
    fulfillmentAttemptId: p.attemptId,
    eventType: LEDGER_EVENT_TYPE.FULFILLMENT_RECOGNIZED,
    metadataJson: {
      orderId: p.orderId,
      attemptId: p.attemptId,
      sellUsdCents,
      feeCents,
      providerCents,
      netCents,
    },
    lines,
  });
}
