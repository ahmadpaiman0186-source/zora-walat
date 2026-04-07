import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { derivePhase1StuckSignals } from './canonicalPhase1Lifecycle.js';
import { recordPhase1StuckSignalObserved, getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';

/**
 * Cohort: `PaymentCheckout.createdAt` within the last `windowHours` (UTC).
 * Rates are **observational**, not predictive; denominators are documented inline.
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {number} [windowHours]
 */
export async function queryPhase1MarketReadinessMetrics(db, windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  const rows = await db.paymentCheckout.findMany({
    where: { createdAt: { gte: since } },
    select: {
      orderStatus: true,
      postPaymentIncidentStatus: true,
    },
  });

  let fulfilled = 0;
  let failed = 0;
  let cancelled = 0;
  let open = 0;
  let postPaymentIncident = 0;
  let fulfilledWithPostPaymentIncident = 0;

  for (const r of rows) {
    const os = r.orderStatus;
    if (os === ORDER_STATUS.FULFILLED) fulfilled += 1;
    else if (os === ORDER_STATUS.FAILED) failed += 1;
    else if (os === ORDER_STATUS.CANCELLED) cancelled += 1;
    else open += 1;

    const pis = r.postPaymentIncidentStatus;
    const hasIncident =
      typeof pis === 'string' &&
      pis.trim() &&
      pis !== POST_PAYMENT_INCIDENT_STATUS.NONE;
    if (hasIncident) {
      postPaymentIncident += 1;
      if (os === ORDER_STATUS.FULFILLED) fulfilledWithPostPaymentIncident += 1;
    }
  }

  const terminalCount = fulfilled + failed;
  const deliverySuccessRate =
    terminalCount > 0 ? fulfilled / terminalCount : null;
  const failureRate = terminalCount > 0 ? failed / terminalCount : null;
  /** Share of delivered orders in cohort with a non-NONE post-payment incident flag. */
  const incidentRate =
    fulfilled > 0 ? fulfilledWithPostPaymentIncident / fulfilled : null;

  return {
    windowHours,
    cohortDefinition:
      'Orders with createdAt >= now - windowHours; rates use this cohort only.',
    ordersCreatedInWindow: rows.length,
    orderStatusCounts: { fulfilled, failed, cancelled, open },
    deliverySuccessRate,
    failureRate,
    incidentRate,
    fulfilledWithPostPaymentIncident,
    postPaymentIncidentOrdersInWindow: postPaymentIncident,
    avgResolutionTimeMs: null,
    avgResolutionTimeNote:
      'avgResolutionTimeMs is not emitted: incident open/resolve times are not stored as structured fields.',
  };
}

/**
 * DB-backed Phase 1 operational snapshot (staff / on-call). Complements in-process `getOpsMetricsSnapshot`.
 *
 * @param {object} [opts]
 * @param {import('@prisma/client').PrismaClient} [opts.prisma]
 * @param {number} [opts.stuckAfterMs] — same default family as canonical processing timeout
 * @param {boolean} [opts.emitStuckSignals] — bump stuck-signal counters (default false; use sparingly in batch jobs)
 */
export async function queryPhase1OperationalExceptionReport(opts = {}) {
  const db = opts.prisma ?? prisma;
  const stuckAfterMs = opts.stuckAfterMs ?? env.processingTimeoutMs ?? 600_000;
  const emitStuck = opts.emitStuckSignals === true;
  const now = Date.now();
  const stuckCutoff = new Date(now - stuckAfterMs);

  const [paidCount, deliveredCount, failedTerminalCount, cancelledCount, anomalyRows] =
    await Promise.all([
      db.paymentCheckout.count({
        where: { orderStatus: ORDER_STATUS.PAID },
      }),
      db.paymentCheckout.count({
        where: { orderStatus: ORDER_STATUS.FULFILLED },
      }),
      db.paymentCheckout.count({
        where: { orderStatus: ORDER_STATUS.FAILED },
      }),
      db.paymentCheckout.count({
        where: { orderStatus: ORDER_STATUS.CANCELLED },
      }),
      db.$queryRaw`
        SELECT elem AS code, COUNT(*)::int AS c
        FROM "PaymentCheckout",
        LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(COALESCE("financialAnomalyCodes"::jsonb, '[]'::jsonb)) = 'array'
            THEN COALESCE("financialAnomalyCodes"::jsonb, '[]'::jsonb)
            ELSE '[]'::jsonb
          END
        ) AS t(elem)
        WHERE elem IS NOT NULL AND trim(elem) <> ''
        GROUP BY elem
        ORDER BY c DESC, elem ASC
      `,
      queryPhase1MarketReadinessMetrics(db, 24),
    ]);

  const opsSnap = getOpsMetricsSnapshot();
  const webhookFailures =
    opsSnap.counters?.stripe_webhook_transaction_failed ?? 0;

  /** @type {Record<string, number>} */
  const anomalyCountByCode = {};
  if (Array.isArray(anomalyRows)) {
    for (const r of anomalyRows) {
      const rec = /** @type {{ code: string, c: number }} */ (r);
      if (typeof rec.code === 'string') {
        anomalyCountByCode[rec.code] = Number(rec.c) || 0;
      }
    }
  }

  /** @type {{ id: string, orderStatus: string, paidAt: Date | null, stuckSignals: string[] }[]} */
  const stuckCandidates = [];

  const candidates = await db.paymentCheckout.findMany({
    where: {
      orderStatus: { in: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING] },
      paidAt: { lt: stuckCutoff },
    },
    select: {
      id: true,
      orderStatus: true,
      status: true,
      paidAt: true,
      metadata: true,
      financialAnomalyCodes: true,
      fulfillmentProviderReference: true,
      fulfillmentProviderKey: true,
      createdAt: true,
      updatedAt: true,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          status: true,
          providerReference: true,
          attemptNumber: true,
          startedAt: true,
        },
      },
      _count: { select: { fulfillmentAttempts: true } },
    },
    take: 500,
    orderBy: { paidAt: 'asc' },
  });

  for (const row of candidates) {
    const latest =
      row.fulfillmentAttempts && row.fulfillmentAttempts.length > 0
        ? row.fulfillmentAttempts[0]
        : null;
    const { fulfillmentAttempts: _fa, _count, ...checkout } = row;
    const attemptCount = _count?.fulfillmentAttempts ?? 0;
    const signals = derivePhase1StuckSignals(checkout, latest, attemptCount, {
      nowMs: now,
      processingTimeoutMs: stuckAfterMs,
    });
    if (signals.length === 0) continue;
    if (emitStuck) {
      for (const s of signals) recordPhase1StuckSignalObserved(s);
      emitPhase1OperationalEvent('stuck_order_detected', {
        orderIdSuffix: String(row.id).slice(-12),
        stuckSignalCount: signals.length,
        stuckSignals: signals,
      });
    }
    stuckCandidates.push({
      id: row.id,
      orderStatus: row.orderStatus,
      paidAt: row.paidAt,
      stuckSignals: signals,
    });
  }

  const processingLatestFailed = await db.paymentCheckout.count({
    where: {
      orderStatus: ORDER_STATUS.PROCESSING,
      status: PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
      fulfillmentAttempts: {
        some: { status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
      },
    },
  });

  /** @type {Record<string, number>} */
  const stuckSignalHistogram = {};
  for (const sc of stuckCandidates) {
    for (const sig of sc.stuckSignals) {
      if (typeof sig !== 'string' || !sig) continue;
      stuckSignalHistogram[sig] = (stuckSignalHistogram[sig] ?? 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    stuckAfterMs,
    paidOrdersCount: paidCount,
    deliveredOrdersCount: deliveredCount,
    failedOrdersCount: failedTerminalCount,
    cancelledOrdersCount: cancelledCount,
    stuckCandidatesCount: stuckCandidates.length,
    stuckCandidates,
    stuckSignalHistogram,
    processingWithLatestFailedAttemptCount: processingLatestFailed,
    anomalyCountByCode,
    lowMarginPersistedCount: anomalyCountByCode.LOW_MARGIN ?? 0,
    webhookFailuresSinceProcessStart: webhookFailures,
    marketReadiness,
    hints: {
      investigate:
        'Use GET /api/admin/ops/order-health?id=<checkoutId>, GET /api/orders/:id/phase1-truth (owner), Stripe Dashboard (session / payment_intent), and logs filtered by X-Trace-Id + phase1Ops JSON.',
    },
  };
}
