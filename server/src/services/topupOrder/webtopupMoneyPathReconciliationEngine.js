/**
 * Read-only WebTopup money-path reconciliation: DB + optional Stripe PI + fulfillment evidence.
 */
import { prisma } from '../../db.js';
import {
  WEBTOPUP_RECON_CATEGORY,
  WEBTOPUP_RECON_CATEGORY_META,
} from '../../constants/webtopupReconciliationCategories.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { getStripeClient } from '../stripe.js';
import { orchestrateStripeCall } from '../reliability/reliabilityOrchestrator.js';
import { webTopupLog } from '../../lib/webTopupObservability.js';
import { compareWebTopupOrderToStripeIntent } from './webTopupReconcileService.js';
import { isValidTopupOrderId } from './topupOrderService.js';
import { isWebTopupFinancialGuardrailErrorCode } from '../../domain/topupOrder/fulfillmentErrors.js';
import { describeFinancialGuardrailForAdmin } from '../topupFulfillment/webtopFinancialGuardrails.js';
import {
  evaluateWebtopOrderSla,
  getWebtopSlaThresholdsForReconciliation,
} from '../../lib/webtopSlaPolicy.js';

/**
 * @typedef {import('@prisma/client').WebTopupOrder} WebTopupOrderRow
 */

/**
 * @param {string[]} issues
 * @returns {{ stripeMoneyMismatch: boolean, stripeLifecycleMismatch: boolean }}
 */
function bucketStripeIssues(issues) {
  const money = new Set([
    'amount_mismatch',
    'currency_mismatch',
    'metadata_order_mismatch',
    'payment_intent_mismatch',
  ]);
  let stripeMoneyMismatch = false;
  let stripeLifecycleMismatch = false;
  for (const i of issues) {
    if (money.has(i)) stripeMoneyMismatch = true;
    else stripeLifecycleMismatch = true;
  }
  return { stripeMoneyMismatch, stripeLifecycleMismatch };
}

/**
 * @param {WebTopupOrderRow | Record<string, unknown>} row
 * @returns {boolean}
 */
function hasContradictoryTerminalSignals(row) {
  const p = String(row.paymentStatus ?? '');
  const f = String(row.fulfillmentStatus ?? '');
  if (f === FULFILLMENT_STATUS.DELIVERED) {
    if (p === PAYMENT_STATUS.PENDING || p === PAYMENT_STATUS.FAILED) return true;
    if (row.fulfillmentFailedAt != null) return true;
  }
  return false;
}

/**
 * @param {WebTopupOrderRow | Record<string, unknown>} row
 * @param {{ issues: string[]; stripeLookupAttempted: boolean }} stripe
 * @param {{ now: Date; thresholds: { paidStuckMs: number; queuedStuckMs: number; processingStuckMs: number } }} ctx
 */
export function classifyWebTopupMoneyPath(row, stripe, ctx) {
  const now = ctx.now;
  const { paidStuckMs, queuedStuckMs, processingStuckMs } = ctx.thresholds;
  const p = String(row.paymentStatus ?? '');
  const f = String(row.fulfillmentStatus ?? '');
  const hasRef =
    row.fulfillmentReference != null &&
    String(row.fulfillmentReference).trim().length > 0;

  const issues = stripe.issues;
  const { stripeMoneyMismatch, stripeLifecycleMismatch } = bucketStripeIssues(issues);

  if (hasContradictoryTerminalSignals(row)) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.DUPLICATE_OR_CONTRADICTORY_TERMINAL_STATE,
      ...WEBTOPUP_RECON_CATEGORY_META[
        WEBTOPUP_RECON_CATEGORY.DUPLICATE_OR_CONTRADICTORY_TERMINAL_STATE
      ],
      summary: 'Incompatible payment and fulfillment terminal signals on one order row.',
      stripeIssues: issues,
    };
  }

  if (
    p === PAYMENT_STATUS.PAID &&
    f === FULFILLMENT_STATUS.FAILED &&
    isWebTopupFinancialGuardrailErrorCode(row.fulfillmentErrorCode)
  ) {
    const hint = describeFinancialGuardrailForAdmin(row.fulfillmentErrorCode);
    return {
      category: WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT,
      ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT],
      summary: `Fulfillment failed after payment (financial guardrail: ${row.fulfillmentErrorCode}).`,
      stripeIssues: issues,
      financialGuardrail: hint
        ? { code: hint.code, repairable: hint.repairable, summary: hint.summary }
        : { code: row.fulfillmentErrorCode, repairable: false, summary: 'Financial guardrail block.' },
    };
  }

  if (stripe.stripeLookupAttempted && stripeMoneyMismatch) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.AMOUNT_OR_CURRENCY_MISMATCH,
      ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.AMOUNT_OR_CURRENCY_MISMATCH],
      summary: 'Stripe PaymentIntent amount/currency/metadata does not match the order.',
      stripeIssues: issues,
    };
  }

  if (stripe.stripeLookupAttempted && stripeLifecycleMismatch) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.WEBHOOK_PAYMENT_MISMATCH,
      ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.WEBHOOK_PAYMENT_MISMATCH],
      summary: 'Stripe PaymentIntent state disagrees with local payment status.',
      stripeIssues: issues,
    };
  }

  if (
    p === PAYMENT_STATUS.PENDING &&
    ((row.fulfillmentAttemptCount ?? 0) > 0 || row.fulfillmentProvider)
  ) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.FULFILLED_BUT_PAYMENT_NOT_CONFIRMED,
      ...WEBTOPUP_RECON_CATEGORY_META[
        WEBTOPUP_RECON_CATEGORY.FULFILLED_BUT_PAYMENT_NOT_CONFIRMED
      ],
      summary:
        'Provider or fulfillment was attempted while payment is still pending in DB.',
      stripeIssues: issues,
    };
  }

  if (p === PAYMENT_STATUS.PAID && f === FULFILLMENT_STATUS.FAILED) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT,
      ...WEBTOPUP_RECON_CATEGORY_META[
        WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT
      ],
      summary: 'Payment captured but fulfillment failed.',
      stripeIssues: issues,
    };
  }

  if (p === PAYMENT_STATUS.PAID && f === FULFILLMENT_STATUS.DELIVERED && !hasRef) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.PAID_BUT_PROVIDER_REFERENCE_MISSING,
      ...WEBTOPUP_RECON_CATEGORY_META[
        WEBTOPUP_RECON_CATEGORY.PAID_BUT_PROVIDER_REFERENCE_MISSING
      ],
      summary: 'Delivered without a stored provider reference.',
      stripeIssues: issues,
    };
  }

  const reqAt = row.fulfillmentRequestedAt
    ? new Date(row.fulfillmentRequestedAt).getTime()
    : null;
  const updatedAt = row.updatedAt ? new Date(row.updatedAt).getTime() : now.getTime();

  if (p === PAYMENT_STATUS.PAID && f === FULFILLMENT_STATUS.PENDING) {
    if (now.getTime() - updatedAt > paidStuckMs) {
      return {
        category: WEBTOPUP_RECON_CATEGORY.STALE_PENDING_AFTER_PAYMENT,
        ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.STALE_PENDING_AFTER_PAYMENT],
        summary: 'Paid order remained in fulfillment pending beyond SLA.',
        stripeIssues: issues,
      };
    }
  }

  if (
    (f === FULFILLMENT_STATUS.QUEUED || f === FULFILLMENT_STATUS.PROCESSING) &&
    reqAt != null
  ) {
    const thr = f === FULFILLMENT_STATUS.QUEUED ? queuedStuckMs : processingStuckMs;
    if (now.getTime() - reqAt > thr) {
      return {
        category: WEBTOPUP_RECON_CATEGORY.STALE_PROCESSING,
        ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.STALE_PROCESSING],
        summary: `Fulfillment ${f} exceeded stuck threshold since fulfillmentRequestedAt.`,
        stripeIssues: issues,
      };
    }
  }

  if (
    p === PAYMENT_STATUS.PAID &&
    [
      FULFILLMENT_STATUS.PENDING,
      FULFILLMENT_STATUS.QUEUED,
      FULFILLMENT_STATUS.PROCESSING,
      FULFILLMENT_STATUS.RETRYING,
    ].includes(f)
  ) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.PAID_BUT_NOT_FULFILLED,
      ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.PAID_BUT_NOT_FULFILLED],
      summary: 'Paid but fulfillment not yet delivered.',
      stripeIssues: issues,
    };
  }

  if (p === PAYMENT_STATUS.PAID && f === FULFILLMENT_STATUS.DELIVERED && hasRef) {
    return {
      category: WEBTOPUP_RECON_CATEGORY.CONSISTENT_PAID_AND_DELIVERED,
      ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.CONSISTENT_PAID_AND_DELIVERED],
      summary: 'Paid, delivered, and provider reference present.',
      stripeIssues: issues,
    };
  }

  if (
    p === PAYMENT_STATUS.PENDING ||
    p === PAYMENT_STATUS.FAILED ||
    p === PAYMENT_STATUS.REFUNDED
  ) {
    if (!row.paymentIntentId && p === PAYMENT_STATUS.PENDING) {
      return {
        category: WEBTOPUP_RECON_CATEGORY.CONSISTENT_NON_TERMINAL,
        ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.CONSISTENT_NON_TERMINAL],
        summary: 'Checkout in progress or awaiting payment.',
        stripeIssues: issues,
      };
    }
    return {
      category: WEBTOPUP_RECON_CATEGORY.INSUFFICIENT_EVIDENCE,
      ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.INSUFFICIENT_EVIDENCE],
      summary: 'Non-paid terminal or edge state — review manually.',
      stripeIssues: issues,
    };
  }

  return {
    category: WEBTOPUP_RECON_CATEGORY.INSUFFICIENT_EVIDENCE,
    ...WEBTOPUP_RECON_CATEGORY_META[WEBTOPUP_RECON_CATEGORY.INSUFFICIENT_EVIDENCE],
    summary: 'Could not classify — manual review.',
    stripeIssues: issues,
  };
}

/**
 * @param {WebTopupOrderRow} row
 * @param {import('pino').Logger | undefined} log
 * @returns {Promise<{ id: string; status: string; amount: number; currency: string; metadata: Record<string, string> } | null>}
 */
async function retrieveStripePiSlice(row, log) {
  const piId = row.paymentIntentId;
  if (!piId) return null;
  const stripe = getStripeClient();
  if (!stripe) return null;
  try {
    const pi = await orchestrateStripeCall({
      operationName: 'paymentIntents.retrieve.webtopup_reconciliation',
      traceId: null,
      log,
      fn: () => stripe.paymentIntents.retrieve(piId),
    });
    return {
      id: pi.id,
      status: pi.status,
      amount: pi.amount,
      currency: pi.currency,
      metadata: pi.metadata ?? {},
    };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   orderId?: string;
 *   limit?: number;
 *   paymentStatus?: string;
 *   fulfillmentStatus?: string;
 *   includeStripeLookup?: boolean;
 *   log?: import('pino').Logger;
 * }} opts
 */
export async function scanWebTopupMoneyPathReconciliation(opts = {}) {
  const log = opts.log;
  const limit = Math.min(500, Math.max(1, opts.limit ?? 50));
  const includeStripe = opts.includeStripeLookup === true;

  webTopupLog(log, 'info', 'reconciliation_scan_started', {
    orderIdSuffix: opts.orderId ? String(opts.orderId).slice(-8) : undefined,
    limit,
    includeStripeLookup: includeStripe,
    paymentStatusFilter: opts.paymentStatus ?? null,
    fulfillmentStatusFilter: opts.fulfillmentStatus ?? null,
  });

  const thresholds = getWebtopSlaThresholdsForReconciliation();
  const now = new Date();

  /** @type {import('@prisma/client').WebTopupOrder[]} */
  let rows = [];

  if (opts.orderId) {
    if (!isValidTopupOrderId(opts.orderId)) {
      return { ok: false, error: 'invalid_order_id', results: [] };
    }
    const one = await prisma.webTopupOrder.findUnique({ where: { id: opts.orderId } });
    if (!one) {
      webTopupLog(log, 'info', 'reconciliation_scan_completed', {
        scanned: 0,
        mismatchCount: 0,
        includeStripeLookup: includeStripe,
        notFound: true,
      });
      return { ok: false, error: 'not_found', results: [] };
    }
    rows = [one];
  } else {
    const where = {};
    if (opts.paymentStatus && String(opts.paymentStatus).trim()) {
      where.paymentStatus = String(opts.paymentStatus).trim();
    }
    if (opts.fulfillmentStatus && String(opts.fulfillmentStatus).trim()) {
      where.fulfillmentStatus = String(opts.fulfillmentStatus).trim();
    }
    rows = await prisma.webTopupOrder.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  /** @type {Record<string, number>} */
  const summary = {};
  const results = [];

  for (const row of rows) {
    let piSlice = null;
    if (includeStripe && row.paymentIntentId) {
      piSlice = await retrieveStripePiSlice(row, log);
    }

    const orderSlice = {
      id: row.id,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      amountCents: row.amountCents,
      currency: row.currency,
      paymentIntentId: row.paymentIntentId,
      completedByStripeEventId: row.completedByStripeEventId,
    };

    const { consistent, issues } = compareWebTopupOrderToStripeIntent(orderSlice, piSlice);
    const piAvailable = Boolean(piSlice);
    const stripeIssuesForClassify = includeStripe ? issues : [];

    const classified = classifyWebTopupMoneyPath(
      row,
      {
        issues: stripeIssuesForClassify,
        stripeLookupAttempted: includeStripe && Boolean(row.paymentIntentId),
      },
      { now, thresholds },
    );

    summary[classified.category] = (summary[classified.category] ?? 0) + 1;

    const isMismatch =
      classified.category !== WEBTOPUP_RECON_CATEGORY.CONSISTENT_PAID_AND_DELIVERED &&
      classified.category !== WEBTOPUP_RECON_CATEGORY.CONSISTENT_NON_TERMINAL;

    if (isMismatch) {
      webTopupLog(log, 'warn', 'reconciliation_mismatch_detected', {
        orderIdSuffix: row.id.slice(-8),
        category: classified.category,
        severity: classified.severity,
      });
    }

    const sla = evaluateWebtopOrderSla(row, now);

    results.push({
      orderId: row.id,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      sla,
      fulfillmentProvider: row.fulfillmentProvider ?? null,
      hasProviderReference: Boolean(
        row.fulfillmentReference && String(row.fulfillmentReference).trim(),
      ),
      paymentIntentIdPresent: Boolean(row.paymentIntentId),
      paymentIntentIdSuffix: row.paymentIntentId ? row.paymentIntentId.slice(-10) : null,
      category: classified.category,
      severity: classified.severity,
      repairable: classified.repairable,
      summary: classified.summary,
      operatorExplanation: WEBTOPUP_RECON_CATEGORY_META[classified.category]?.explanation ?? null,
      stripe: includeStripe
        ? {
            lookupAttempted: true,
            retrieved: piAvailable,
            consistentWithDb: consistent,
            issues,
          }
        : { lookupAttempted: false },
      correlation: {
        sessionKeySuffix: row.sessionKey ? row.sessionKey.slice(-4) : null,
        completedByStripeEventIdSuffix: row.completedByStripeEventId
          ? String(row.completedByStripeEventId).slice(-12)
          : null,
      },
    });
  }

  const mismatchCount = results.filter(
    (r) =>
      r.category !== WEBTOPUP_RECON_CATEGORY.CONSISTENT_PAID_AND_DELIVERED &&
      r.category !== WEBTOPUP_RECON_CATEGORY.CONSISTENT_NON_TERMINAL,
  ).length;

  webTopupLog(log, 'info', 'reconciliation_scan_completed', {
    scanned: results.length,
    mismatchCount,
    includeStripeLookup: includeStripe,
  });

  return {
    ok: true,
    scannedAt: now.toISOString(),
    thresholds,
    summary,
    mismatchCount,
    results,
  };
}
