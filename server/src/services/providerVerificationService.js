/**
 * Provider truth: persisted proof + optional live Reloadly reports lookup (no duplicate POST /topups).
 */

import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../constants/paymentFulfillmentReconciliationStatus.js';
import { PROVIDER_TRUTH_STATUS } from '../constants/providerTruthStatus.js';
import {
  bumpMetric,
  bumpProviderMismatchObservedMetric,
  emitResilienceStructuredLog,
} from '../utils/metrics.js';
import { computePaymentCheckoutTrustScore } from '../lib/paymentCheckoutTrust.js';
import { emitMoneyPathAlert } from './moneyPathAlertService.js';
import { findReloadlyTopupReportRowByCustomIdentifier } from './reloadlyTransactionInquiry.js';
import {
  compareReloadlyTruthToOrder,
  extractReloadlyReportTruth,
} from './reloadlyProviderTruthCompare.js';
import { buildReloadlyPhase1CustomIdentifier } from '../lib/providerExecutionCorrelation.js';

function parseJsonObject(str) {
  if (str == null || typeof str !== 'string' || !str.trim()) return null;
  try {
    const o = JSON.parse(str);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
}

/**
 * @param {import('@prisma/client').PaymentCheckout & { fulfillmentAttempts?: import('@prisma/client').FulfillmentAttempt[] }} row
 * @returns {{ ok: boolean, code: string }}
 */
export function evaluateDeliveredProviderTruth(row) {
  if (String(row.orderStatus ?? '') !== ORDER_STATUS.FULFILLED) {
    return { ok: true, code: 'skipped_not_delivered' };
  }

  const att =
    row.fulfillmentAttempts?.find((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) ??
    row.fulfillmentAttempts?.[0] ??
    null;

  if (!att || att.status !== FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
    return { ok: false, code: 'fulfillment_attempt_not_succeeded' };
  }

  const ref =
    (typeof att.providerReference === 'string' && att.providerReference.trim()) ||
    (typeof row.fulfillmentProviderReference === 'string' &&
      row.fulfillmentProviderReference.trim()) ||
    '';

  if (!ref) {
    return { ok: false, code: 'missing_provider_reference' };
  }

  const res = parseJsonObject(att.responseSummary);
  if (res) {
    const outcome = String(res.outcome ?? res.normalizedOutcome ?? '').toLowerCase();
    if (outcome && outcome !== 'success' && outcome !== 'delivered') {
      if (
        outcome === 'failure' ||
        outcome === 'failed' ||
        outcome === 'error'
      ) {
        return { ok: false, code: 'response_summary_negative_outcome' };
      }
    }
  }

  return { ok: true, code: 'ok' };
}

/**
 * @param {import('@prisma/client').PaymentCheckout & { fulfillmentAttempts?: import('@prisma/client').FulfillmentAttempt[] }} row
 * @param {{ traceId?: string | null, live?: boolean }} opts
 */
async function verifyAndPersistFulfilledOrder(row, opts = {}) {
  const traceId = opts.traceId ?? null;
  const t0 = Date.now();
  const local = evaluateDeliveredProviderTruth(row);
  let providerTruth = PROVIDER_TRUTH_STATUS.UNKNOWN;
  let reconciliationStatus = String(
    row.reconciliationStatus ?? PAYMENT_FULFILLMENT_RECON_STATUS.OK,
  );
  /** @type {string[]} */
  let mismatchDetail = [];

  const wantLive =
    opts.live === true ||
    (opts.live !== false && env.providerTruthLiveVerify === true);

  if (String(row.orderStatus ?? '') !== ORDER_STATUS.FULFILLED) {
    return { ok: true, code: 'skipped_not_delivered' };
  }

  if (
    wantLive &&
    String(env.airtimeProvider ?? '').toLowerCase() === 'reloadly' &&
    !env.reloadlyInquiryBeforeRetryDisabled
  ) {
    const att = row.fulfillmentAttempts?.[0];
    if (att?.id) {
      const customId = buildReloadlyPhase1CustomIdentifier(row.id, att.id);
      const hit = await findReloadlyTopupReportRowByCustomIdentifier(customId);
      if (!hit.found) {
        providerTruth = PROVIDER_TRUTH_STATUS.UNKNOWN;
        reconciliationStatus = String(
          row.reconciliationStatus ?? PAYMENT_FULFILLMENT_RECON_STATUS.OK,
        );
      } else {
        const remote = extractReloadlyReportTruth(
          /** @type {Record<string, unknown>} */ (hit.row),
        );
        const cmp = compareReloadlyTruthToOrder(
          {
            amountUsdCents: row.amountUsdCents,
            recipientNational: row.recipientNational,
            operatorKey: row.operatorKey,
          },
          remote,
          { operatorMap: env.reloadlyOperatorMap },
        );
        mismatchDetail = cmp.mismatches;
        if (cmp.ok) {
          providerTruth = PROVIDER_TRUTH_STATUS.OK;
          if (reconciliationStatus === PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED) {
            reconciliationStatus = PAYMENT_FULFILLMENT_RECON_STATUS.REPAIRED;
          }
        } else {
          providerTruth = PROVIDER_TRUTH_STATUS.MISMATCH;
          reconciliationStatus = PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED;
        }
      }
    } else {
      providerTruth = local.ok ? PROVIDER_TRUTH_STATUS.OK : PROVIDER_TRUTH_STATUS.MISMATCH;
      if (!local.ok) {
        reconciliationStatus = PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED;
      }
    }
  } else {
    providerTruth = local.ok ? PROVIDER_TRUTH_STATUS.OK : PROVIDER_TRUTH_STATUS.MISMATCH;
    if (!local.ok) {
      reconciliationStatus = PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED;
    } else {
      reconciliationStatus = String(
        row.reconciliationStatus ?? PAYMENT_FULFILLMENT_RECON_STATUS.OK,
      );
    }
  }

  const trustScore = computePaymentCheckoutTrustScore({
    status: row.status,
    orderStatus: row.orderStatus,
    completedByWebhookEventId: row.completedByWebhookEventId,
    providerTruthStatus: providerTruth,
    reconciliationStatus,
  });

  /** @type {Record<string, unknown>} */
  const patch = {
    providerTruthCheckedAt: new Date(),
    providerTruthStatus: providerTruth,
    trustScore,
  };
  if (reconciliationStatus !== String(row.reconciliationStatus ?? '')) {
    patch.reconciliationStatus = reconciliationStatus;
  }
  await prisma.paymentCheckout.updateMany({
    where: { id: row.id },
    data: patch,
  });

  if (providerTruth === PROVIDER_TRUTH_STATUS.MISMATCH) {
    bumpMetric('provider_verification_mismatch_total', 1);
    bumpProviderMismatchObservedMetric();
    emitMoneyPathAlert('critical', 'provider_truth_mismatch', {
      orderId: row.id,
      traceId,
      extra: {
        mismatchDetail,
        truthSource: wantLive ? 'reloadly_reports' : 'persisted_only',
      },
    });
    emitResilienceStructuredLog({
      orderId: row.id,
      checkoutId: row.id,
      stage: 'provider_verification',
      status: 'mismatch',
      latencyMs: Date.now() - t0,
      errorCode: mismatchDetail.length ? mismatchDetail.join(',') : 'persisted_mismatch',
      traceId,
      extra: { truthSource: wantLive ? 'reloadly_reports' : 'persisted_only' },
    });
  }

  return { ok: providerTruth !== PROVIDER_TRUTH_STATUS.MISMATCH, code: providerTruth };
}

/**
 * @param {string} orderId
 * @param {{ traceId?: string | null, live?: boolean }} [opts]
 */
export async function runProviderTruthVerificationForOrderId(orderId, opts = {}) {
  const row = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    include: {
      fulfillmentAttempts: {
        where: { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
        orderBy: { attemptNumber: 'desc' },
        take: 1,
      },
    },
  });
  if (!row) return { ok: false, code: 'not_found' };
  return verifyAndPersistFulfilledOrder(row, opts);
}

function fulfillmentTruthInclude() {
  return {
    fulfillmentAttempts: {
      where: { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      orderBy: { attemptNumber: 'desc' },
      take: 1,
    },
  };
}

/**
 * Smart live verification: low trust, recon not ok, retries, or high-value fulfilled orders.
 *
 * @param {number} limit
 * @param {Set<string>} excludeIds
 */
async function findSmartProviderTruthCandidates(limit, excludeIds) {
  const idPart =
    excludeIds.size > 0 ? { id: { notIn: [...excludeIds] } } : {};
  return prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.FULFILLED,
      ...idPart,
      OR: [
        { trustScore: { lt: 70 } },
        { reconciliationStatus: { not: PAYMENT_FULFILLMENT_RECON_STATUS.OK } },
        { amountUsdCents: { gte: env.providerTruthHighValueUsdCents } },
        {
          fulfillmentAttempts: {
            some: {
              OR: [
                { attemptNumber: { gt: 1 } },
                { status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
              ],
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    include: fulfillmentTruthInclude(),
  });
}

/**
 * @param {{ limit?: number, traceId?: string | null }} [opts]
 * @returns {Promise<{ scanned: number, mismatches: number, flagged: number, smartLive: number, ms: number }>}
 */
export async function runProviderTruthVerificationTick(opts = {}) {
  const t0 = Date.now();
  const traceId = opts.traceId ?? null;
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 50);

  const smartRows = await findSmartProviderTruthCandidates(limit, new Set());
  const smartIds = new Set(smartRows.map((r) => r.id));

  const remaining = limit - smartRows.length;
  /** @type {typeof smartRows} */
  let filler = [];
  if (remaining > 0) {
    const ex = smartIds.size > 0 ? { id: { notIn: [...smartIds] } } : {};
    filler = await prisma.paymentCheckout.findMany({
      where: { orderStatus: ORDER_STATUS.FULFILLED, ...ex },
      orderBy: { updatedAt: 'desc' },
      take: remaining,
      include: fulfillmentTruthInclude(),
    });
  }

  const rows = [...smartRows, ...filler];

  let mismatches = 0;
  let flagged = 0;
  let smartLive = 0;

  for (const row of rows) {
    const forceLive = smartIds.has(row.id);
    if (forceLive) smartLive += 1;
    const v = await verifyAndPersistFulfilledOrder(row, {
      traceId,
      live: forceLive ? true : undefined,
    });
    if (v.code === PROVIDER_TRUTH_STATUS.MISMATCH) {
      mismatches += 1;
      flagged += 1;
    }
  }

  return {
    scanned: rows.length,
    mismatches,
    flagged,
    smartLive,
    ms: Date.now() - t0,
  };
}
