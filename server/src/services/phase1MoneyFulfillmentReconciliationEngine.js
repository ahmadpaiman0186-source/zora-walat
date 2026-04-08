/**
 * Foundation reconciliation engine: detects Phase 1 money↔fulfillment divergence (read-only).
 * Produces **recommendations only** — no automatic money or provider repair.
 */
import { prisma, Prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { recordPhase1ReconciliationFinding } from '../lib/opsMetrics.js';

export const RECON_RECOMMENDATION = {
  NONE: 'NONE',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  SAFE_QUEUE_RETRY_CANDIDATE: 'SAFE_QUEUE_RETRY_CANDIDATE',
  VERIFY_STRIPE_PAYMENT: 'VERIFY_STRIPE_PAYMENT',
  VERIFY_PROVIDER_EVIDENCE: 'VERIFY_PROVIDER_EVIDENCE',
};

export const RECON_DIVERGENCE_CODE = {
  PAID_NOT_FULFILLED_AGED: 'PAID_NOT_FULFILLED_AGED',
  PAID_NO_ATTEMPT: 'PAID_NO_ATTEMPT',
  FULFILLED_PAYMENT_ROW_MISMATCH: 'FULFILLED_PAYMENT_ROW_MISMATCH',
  ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED: 'ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED',
  PROCESSING_LAST_ATTEMPT_FAILED: 'PROCESSING_LAST_ATTEMPT_FAILED',
  /** Latest attempt shows explicit stalled hold (no blind POST policy). */
  PROVIDER_UNKNOWN_STALL: 'PROVIDER_UNKNOWN_STALL',
  /** Reloadly pre-HTTP arm timestamp is stale vs PROCESSING — possible crash between arm and outcome commit. */
  PRE_HTTP_DISPATCH_ARMED_STALE: 'PRE_HTTP_DISPATCH_ARMED_STALE',
  /** Paid / processing row inconsistent with latest attempt signals (heuristic; never auto-fix). */
  INCONSISTENT_ATTEMPT_VS_ORDER: 'INCONSISTENT_ATTEMPT_VS_ORDER',
};

/**
 * Actionable operator vocabulary (read-only engine — recommendations only).
 */
export const RECON_V2_ACTION = Object.freeze({
  NO_ACTION: 'NO_ACTION',
  VERIFY_PROVIDER_FIRST: 'VERIFY_PROVIDER_FIRST',
  SAFE_RETRY: 'SAFE_RETRY',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  BLOCKED_UNTIL_CONFIRMATION: 'BLOCKED_UNTIL_CONFIRMATION',
});

/**
 * @param {{ limit?: number, paidIdleMs?: number, now?: Date }} [opts]
 */
export async function runPhase1MoneyFulfillmentReconciliationScan(opts = {}) {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 50));
  const now = opts.now instanceof Date ? opts.now : new Date();
  const paidIdleMs = opts.paidIdleMs ?? 120_000;
  const paidCutoff = new Date(now.getTime() - paidIdleMs);

  /** @type {object[]} */
  const findings = [];

  const paidIdle = await prisma.paymentCheckout.findMany({
    where: {
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.PAID,
      paidAt: { lte: paidCutoff },
    },
    orderBy: { paidAt: 'asc' },
    take: limit,
    include: {
      fulfillmentAttempts: { orderBy: { attemptNumber: 'desc' }, take: 3 },
    },
  });

  for (const row of paidIdle) {
    const attempts = row.fulfillmentAttempts ?? [];
    const { recommendation, code, rationale, retrySafeHypothesis } =
      classifyPaidIdle(row, attempts);
    findings.push({
      checkoutId: row.id,
      divergenceCode: code,
      recommendation,
      rationale,
      retrySafeHypothesis,
      orderStatus: row.orderStatus,
      paymentStatus: row.status,
      paidAt: row.paidAt?.toISOString() ?? null,
      attemptSummaries: attempts.map((a) => ({
        id: a.id,
        n: a.attemptNumber,
        status: a.status,
        providerReference: a.providerReference ? 'present' : null,
      })),
    });
  }

  const mismatchedPayment = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.FULFILLED,
      status: { not: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED },
    },
    take: Math.min(100, limit),
    select: {
      id: true,
      orderStatus: true,
      status: true,
      stripePaymentIntentId: true,
    },
  });

  for (const row of mismatchedPayment) {
    findings.push({
      checkoutId: row.id,
      divergenceCode: RECON_DIVERGENCE_CODE.FULFILLED_PAYMENT_ROW_MISMATCH,
      recommendation: RECON_RECOMMENDATION.MANUAL_REVIEW,
      rationale:
        'Order lifecycle FULFILLED but payment row is not RECHARGE_COMPLETED — investigate Stripe + webhook idempotency before any customer comms.',
      retrySafeHypothesis: false,
      orderStatus: row.orderStatus,
      paymentStatus: row.status,
    });
  }

  const orphanSuccess = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: {
        notIn: [
          ORDER_STATUS.FULFILLED,
          ORDER_STATUS.FAILED,
          ORDER_STATUS.CANCELLED,
        ],
      },
      fulfillmentAttempts: {
        some: { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      },
    },
    take: Math.min(50, limit),
    select: {
      id: true,
      orderStatus: true,
      status: true,
    },
  });

  for (const row of orphanSuccess) {
    findings.push({
      checkoutId: row.id,
      divergenceCode: RECON_DIVERGENCE_CODE.ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED,
      recommendation: RECON_RECOMMENDATION.MANUAL_REVIEW,
      rationale:
        'Fulfillment attempt SUCCEEDED but checkout not terminal FULFILLED — risk of double-send or incomplete commit; no auto repair.',
      retrySafeHypothesis: false,
      orderStatus: row.orderStatus,
      paymentStatus: row.status,
    });
  }

  const stalledProcessing = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.PROCESSING },
    take: Math.min(80, limit),
    select: {
      id: true,
      orderStatus: true,
      status: true,
    },
  });
  for (const row of stalledProcessing) {
    const latest = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: row.id },
      orderBy: { attemptNumber: 'desc' },
      select: { id: true, status: true, responseSummary: true },
    });
    if (!latest || latest.status !== FULFILLMENT_ATTEMPT_STATUS.PROCESSING) continue;
    const summaryObj = parseJsonMaybe(latest.responseSummary);
    if (summaryObj?.stalledVerificationHold === true) {
      findings.push({
        checkoutId: row.id,
        divergenceCode: RECON_DIVERGENCE_CODE.PROVIDER_UNKNOWN_STALL,
        recommendation: RECON_RECOMMENDATION.VERIFY_PROVIDER_EVIDENCE,
        rationale:
          'Stalled verification hold on latest PROCESSING attempt — confirm Reloadly/report truth before queue or DLQ replay; no blind POST.',
        retrySafeHypothesis: false,
        orderStatus: row.orderStatus,
        paymentStatus: row.status,
        attemptId: latest.id,
        stalledSubstate: summaryObj.stalledSubstate ?? null,
      });
    }
  }

  const armedStaleMs = Math.min(
    86_400_000,
    Math.max(60_000, env.phase1ReconPreHttpArmedStaleMs),
  );
  const armedCutoffMs = now.getTime() - armedStaleMs;
  const preHttpArmCandidates = await prisma.fulfillmentAttempt.findMany({
    where: {
      status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
      providerReference: null,
      provider: 'reloadly',
      order: { orderStatus: ORDER_STATUS.PROCESSING },
    },
    take: Math.min(60, limit),
    select: {
      orderId: true,
      requestSummary: true,
      responseSummary: true,
    },
  });
  for (const att of preHttpArmCandidates) {
    const reqObj = parseJsonMaybe(att.requestSummary);
    const armedRaw = reqObj?.reloadlyPreHttpArmedAt;
    if (typeof armedRaw !== 'string') continue;
    const armedMs = Date.parse(armedRaw);
    if (!Number.isFinite(armedMs) || armedMs > armedCutoffMs) continue;
    const resObj = parseJsonMaybe(att.responseSummary);
    if (resObj?.stalledVerificationHold === true) continue;
    const checkout = await prisma.paymentCheckout.findUnique({
      where: { id: att.orderId },
      select: { orderStatus: true, status: true },
    });
    if (!checkout) continue;
    findings.push({
      checkoutId: att.orderId,
      divergenceCode: RECON_DIVERGENCE_CODE.PRE_HTTP_DISPATCH_ARMED_STALE,
      recommendation: RECON_RECOMMENDATION.VERIFY_PROVIDER_EVIDENCE,
      rationale:
        'Reloadly pre-HTTP dispatch was armed but attempt remains PROCESSING without providerReference beyond the stale window — possible crash ordering; confirm provider truth before retry.',
      retrySafeHypothesis: false,
      orderStatus: checkout.orderStatus,
      paymentStatus: checkout.status,
      preHttpArmedAt: armedRaw,
      preHttpStaleMs: armedStaleMs,
    });
  }

  /** @type {Set<string>} */
  const inconsistentSeen = new Set();

  /**
   * @param {{ id: string, orderStatus: string, status: string }} row
   * @param {string} inconsistencyKind
   * @param {Record<string, unknown>} [extra]
   */
  function pushInconsistentFinding(row, inconsistencyKind, extra = {}) {
    if (inconsistentSeen.has(row.id)) return;
    inconsistentSeen.add(row.id);
    findings.push({
      checkoutId: row.id,
      divergenceCode: RECON_DIVERGENCE_CODE.INCONSISTENT_ATTEMPT_VS_ORDER,
      recommendation: RECON_RECOMMENDATION.MANUAL_REVIEW,
      rationale: `Fulfillment attempts vs order lifecycle inconsistent (${inconsistencyKind}) — verify DB rows, provider evidence, and Stripe before any retry; no auto repair.`,
      retrySafeHypothesis: false,
      orderStatus: row.orderStatus,
      paymentStatus: row.status,
      inconsistencyKind,
      ...extra,
    });
  }

  const dupCap = Math.min(50, limit);
  const multiSuccessIds = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "orderId" AS id
      FROM "FulfillmentAttempt"
      WHERE status = ${FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED}
      GROUP BY "orderId"
      HAVING COUNT(*)::int > 1
      LIMIT ${dupCap}
    `,
  );
  for (const r of /** @type {{ id: string }[]} */ (multiSuccessIds)) {
    const row = await prisma.paymentCheckout.findUnique({
      where: { id: r.id },
      select: { id: true, orderStatus: true, status: true },
    });
    if (row) {
      pushInconsistentFinding(row, 'multiple_succeeded_attempts', {
        hint: 'More than one SUCCEEDED FulfillmentAttempt for this PaymentCheckout.id.',
      });
    }
  }

  const fulfilledRows = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.FULFILLED },
    take: Math.min(80, limit),
    select: { id: true, orderStatus: true, status: true },
  });
  for (const row of fulfilledRows) {
    const latest = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: row.id },
      orderBy: { attemptNumber: 'desc' },
      select: { id: true, status: true, attemptNumber: true },
    });
    const succCount = await prisma.fulfillmentAttempt.count({
      where: { orderId: row.id, status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
    });
    const inc = evaluateCheckoutAttemptInconsistency(row.orderStatus, latest, succCount);
    if (inc) {
      pushInconsistentFinding(row, inc.inconsistencyKind, {
        latestAttemptStatus: latest?.status ?? null,
      });
    }
  }

  const terminalBad = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: { in: [ORDER_STATUS.FAILED, ORDER_STATUS.CANCELLED] },
      fulfillmentAttempts: {
        some: { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      },
    },
    take: Math.min(50, limit),
    select: { id: true, orderStatus: true, status: true },
  });
  for (const row of terminalBad) {
    const latest = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: row.id },
      orderBy: { attemptNumber: 'desc' },
      select: { id: true, status: true },
    });
    const succCount = await prisma.fulfillmentAttempt.count({
      where: { orderId: row.id, status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
    });
    const inc = evaluateCheckoutAttemptInconsistency(row.orderStatus, latest, succCount);
    if (inc) {
      pushInconsistentFinding(row, inc.inconsistencyKind, {
        latestAttemptStatus: latest?.status ?? null,
      });
    }
  }

  const processingRows = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.PROCESSING },
    take: Math.min(80, limit),
    select: { id: true, orderStatus: true, status: true },
  });
  for (const row of processingRows) {
    const latest = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: row.id },
      orderBy: { attemptNumber: 'desc' },
      select: { id: true, status: true },
    });
    const succCount = await prisma.fulfillmentAttempt.count({
      where: { orderId: row.id, status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
    });
    const inc = evaluateCheckoutAttemptInconsistency(row.orderStatus, latest, succCount);
    if (inc) {
      pushInconsistentFinding(row, inc.inconsistencyKind, {
        latestAttemptStatus: latest?.status ?? null,
      });
    }
  }

  const withV2 = findings.map(enrichPhase1MoneyFindingV2);
  for (const f of withV2) {
    recordPhase1ReconciliationFinding(f.divergenceCode);
  }

  return {
    schema: 'zora.phase1_money_fulfillment_recon.v2',
    scannedAt: now.toISOString(),
    parameters: {
      limit,
      paidIdleMs,
      paidCutoff: paidCutoff.toISOString(),
      preHttpArmedStaleMs: armedStaleMs,
    },
    findings: withV2,
    summary: {
      count: withV2.length,
      byRecommendation: tally(withV2, (f) => f.recommendation),
      byCode: tally(withV2, (f) => f.divergenceCode),
      byActionV2: tally(withV2, (f) => f.actionV2 ?? 'UNKNOWN'),
    },
  };
}

/**
 * @param {unknown} raw
 */
function parseJsonMaybe(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return /** @type {Record<string, unknown>} */ (raw);
  if (typeof raw !== 'string') return null;
  try {
    return /** @type {Record<string, unknown>} */ (JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * @param {object} finding
 */
export function enrichPhase1MoneyFindingV2(finding) {
  const rec = finding.recommendation;
  const code = finding.divergenceCode;
  /** @type {string} */
  let actionV2 = RECON_V2_ACTION.MANUAL_REVIEW_REQUIRED;
  if (rec === RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE) {
    actionV2 = RECON_V2_ACTION.SAFE_RETRY;
  } else if (
    rec === RECON_RECOMMENDATION.VERIFY_PROVIDER_EVIDENCE ||
    rec === RECON_RECOMMENDATION.VERIFY_STRIPE_PAYMENT
  ) {
    actionV2 = RECON_V2_ACTION.VERIFY_PROVIDER_FIRST;
  } else if (rec === RECON_RECOMMENDATION.MANUAL_REVIEW) {
    if (
      code === RECON_DIVERGENCE_CODE.ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED ||
      code === RECON_DIVERGENCE_CODE.FULFILLED_PAYMENT_ROW_MISMATCH ||
      code === RECON_DIVERGENCE_CODE.PROVIDER_UNKNOWN_STALL ||
      code === RECON_DIVERGENCE_CODE.INCONSISTENT_ATTEMPT_VS_ORDER
    ) {
      actionV2 = RECON_V2_ACTION.BLOCKED_UNTIL_CONFIRMATION;
    } else {
      actionV2 = RECON_V2_ACTION.MANUAL_REVIEW_REQUIRED;
    }
  }
  const explain = [
    `divergenceCode=${code}`,
    `legacyRecommendation=${rec}`,
    `actionV2=${actionV2}`,
    finding.retrySafeHypothesis === true ? 'retrySafeHypothesis=true' : 'retrySafeHypothesis=false',
  ].join('; ');
  const operatorPlaybook = buildOperatorPlaybook({
    ...finding,
    actionV2,
    divergenceCode: code,
  });
  return { ...finding, actionV2, explain, operatorPlaybook };
}

/**
 * @param {{ divergenceCode?: string, actionV2?: string, recommendation?: string }} f
 * @returns {string[]}
 */
function buildOperatorPlaybook(f) {
  const code = f.divergenceCode;
  const action = f.actionV2;
  /** @type {string[]} */
  const steps = [];
  if (action === RECON_V2_ACTION.SAFE_RETRY) {
    steps.push(
      'Guardrails: confirm Stripe payment_intent succeeded and no duplicate PaymentCheckout; enqueue worker or run approved DLQ replay only from a single operator.',
    );
  } else if (action === RECON_V2_ACTION.VERIFY_PROVIDER_FIRST) {
    steps.push(
      'Reloadly: inquiry/report on customIdentifier from FulfillmentAttempt.requestSummary before any new POST or replay.',
    );
    if (code === RECON_DIVERGENCE_CODE.PRE_HTTP_DISPATCH_ARMED_STALE) {
      steps.push(
        'Crash-ordering suspected (pre-HTTP arm stale, no providerReference): prove provider absence/presence; forbid blind duplicate POST.',
      );
    }
    if (code === RECON_DIVERGENCE_CODE.PROVIDER_UNKNOWN_STALL) {
      steps.push('Treat as stalled verification — follow existing no-blind-POST runbook; Redis/provider markers may be stale.');
    }
  } else if (action === RECON_V2_ACTION.BLOCKED_UNTIL_CONFIRMATION) {
    steps.push(
      'Stop automated retries; reconcile Stripe + provider + DB in one audited change after explicit evidence.',
    );
  } else {
    steps.push(
      'Triage: capture correlationId, fulfillmentAttempt ids, Stripe evt_ ids, Reloadly customIdentifier, and ops metrics snapshot.',
    );
  }
  return steps;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(x: T) => string} fn
 */
function tally(arr, fn) {
  /** @type {Record<string, number>} */
  const o = {};
  for (const x of arr) {
    const k = fn(x);
    o[k] = (o[k] ?? 0) + 1;
  }
  return o;
}

/**
 * Pure classifier (recon + unit tests). Does not cover “orphan success” (non-terminal + succeeded);
 * that remains `ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED`.
 * @param {string} orderStatus
 * @param {{ status: string } | null | undefined} latestAttempt
 * @param {number} succeededCount
 * @returns {{ inconsistencyKind: string } | null}
 */
export function evaluateCheckoutAttemptInconsistency(
  orderStatus,
  latestAttempt,
  succeededCount,
) {
  const sc = Math.max(0, Math.floor(Number(succeededCount) || 0));
  const latest = latestAttempt?.status ?? null;

  if (sc > 1) {
    return { inconsistencyKind: 'multiple_succeeded_attempts' };
  }
  if (orderStatus === ORDER_STATUS.FULFILLED) {
    if (!latestAttempt || latest !== FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
      return { inconsistencyKind: 'fulfilled_without_latest_success_attempt' };
    }
  }
  if (orderStatus === ORDER_STATUS.FAILED || orderStatus === ORDER_STATUS.CANCELLED) {
    if (sc >= 1) {
      return { inconsistencyKind: 'terminal_negative_with_success_attempt' };
    }
  }
  if (orderStatus === ORDER_STATUS.PROCESSING) {
    if (latest === FULFILLMENT_ATTEMPT_STATUS.FAILED && sc >= 1) {
      return { inconsistencyKind: 'processing_latest_failed_after_prior_success' };
    }
  }
  return null;
}

/**
 * @param {import('@prisma/client').PaymentCheckout & { fulfillmentAttempts: import('@prisma/client').FulfillmentAttempt[] }} row
 * @param {import('@prisma/client').FulfillmentAttempt[]} attempts
 */
function classifyPaidIdle(row, attempts) {
  if (!attempts.length) {
    return {
      code: RECON_DIVERGENCE_CODE.PAID_NO_ATTEMPT,
      recommendation: RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE,
      rationale:
        'Payment succeeded but no fulfillment attempts — safe candidate to enqueue worker after confirming Stripe PI succeeded and no duplicate checkout.',
      retrySafeHypothesis: true,
    };
  }
  const latest = attempts[0];
  if (latest.status === FULFILLMENT_ATTEMPT_STATUS.FAILED) {
    return {
      code: RECON_DIVERGENCE_CODE.PROCESSING_LAST_ATTEMPT_FAILED,
      recommendation: RECON_RECOMMENDATION.MANUAL_REVIEW,
      rationale:
        'Paid row stuck with failed latest attempt — inspect provider evidence before retry.',
      retrySafeHypothesis: false,
    };
  }
  return {
    code: RECON_DIVERGENCE_CODE.PAID_NOT_FULFILLED_AGED,
    recommendation: RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE,
    rationale:
      'Paid beyond idle window with attempts present — verify worker health; may need queue replay if attempts stalled in QUEUED.',
    retrySafeHypothesis: true,
  };
}
