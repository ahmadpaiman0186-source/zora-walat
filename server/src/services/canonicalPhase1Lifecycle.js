import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';

/**
 * Single canonical lifecycle phase for Phase 1 MOBILE_TOPUP (support/ops).
 * Derived only from persisted order + latest attempt + manual flags — never guessed from missing data.
 */
export const PHASE1_CANONICAL_PHASE = {
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  /** Paid; fulfillment not started or queued. */
  PAID_FULFILLMENT_PENDING: 'PAID_FULFILLMENT_PENDING',
  /** Provider work in flight (order PROCESSING). */
  FULFILLMENT_IN_PROGRESS: 'FULFILLMENT_IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  /** manualRequired metadata set — operator review. */
  MANUAL_REVIEW: 'MANUAL_REVIEW',
};

/**
 * @param {unknown} metadata PaymentCheckout.metadata JSON
 */
export function parseManualReviewFlags(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      manualReviewRequired: false,
      manualReviewReason: null,
      manualReviewClassification: null,
    };
  }
  const m = /** @type {Record<string, unknown>} */ (metadata);
  const pr =
    m.processingRecovery &&
    typeof m.processingRecovery === 'object' &&
    !Array.isArray(m.processingRecovery)
      ? /** @type {Record<string, unknown>} */ (m.processingRecovery)
      : null;
  const manualReviewRequired =
    m.manualRequired === true || (pr != null && pr.manualRequired === true);
  const manualReviewReason =
    (pr && typeof pr.manualRequiredReason === 'string'
      ? pr.manualRequiredReason
      : null) ??
    (typeof m.manualRequiredReason === 'string' ? m.manualRequiredReason : null);
  const manualReviewClassification =
    (pr && typeof pr.manualRequiredClassification === 'string'
      ? pr.manualRequiredClassification
      : null) ??
    (typeof m.manualRequiredClassification === 'string'
      ? m.manualRequiredClassification
      : null);

  return {
    manualReviewRequired,
    manualReviewReason,
    manualReviewClassification,
  };
}

/**
 * Stuck / risk signals — queryable; do not replace anomaly codes (finance) or audits.
 * @param {import('@prisma/client').PaymentCheckout} checkout
 * @param {import('@prisma/client').FulfillmentAttempt | null | undefined} latestAttempt
 * @param {number} attemptCount
 * @param {{ nowMs?: number, processingTimeoutMs?: number }} [opts]
 * @returns {string[]}
 */
export function derivePhase1StuckSignals(checkout, latestAttempt, attemptCount, opts = {}) {
  const signals = [];
  const now = opts.nowMs ?? Date.now();
  const timeoutMs =
    opts.processingTimeoutMs != null && opts.processingTimeoutMs > 0
      ? opts.processingTimeoutMs
      : 600_000;
  const os = checkout.orderStatus;
  const paidAt = checkout.paidAt;
  const paidMs = paidAt instanceof Date ? paidAt.getTime() : null;

  const terminal =
    os === ORDER_STATUS.FAILED ||
    os === ORDER_STATUS.CANCELLED ||
    os === ORDER_STATUS.FULFILLED ||
    os === ORDER_STATUS.DELIVERED;

  if (paidMs != null && !terminal && (os === ORDER_STATUS.PAID || os === ORDER_STATUS.PROCESSING)) {
    if (now - paidMs > timeoutMs) {
      signals.push('PAID_OR_PROCESSING_EXCEEDS_PROCESSING_TIMEOUT');
    }
  }

  /** Paid but no fulfillment attempt rows (webhook/queue defect) — shorter threshold than full processing timeout. */
  if (
    os === ORDER_STATUS.PAID &&
    attemptCount === 0 &&
    paidMs != null &&
    !terminal &&
    now - paidMs > Math.min(120_000, timeoutMs)
  ) {
    signals.push('PAID_BUT_NO_FULFILLMENT_ATTEMPT');
  }

  if (
    os === ORDER_STATUS.PROCESSING &&
    latestAttempt?.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING
  ) {
    const ref = latestAttempt.providerReference;
    const noRef = ref == null || String(ref).trim() === '';
    const started = latestAttempt.startedAt;
    const startedMs = started instanceof Date ? started.getTime() : null;
    if (noRef && startedMs != null && now - startedMs > Math.max(60_000, Math.floor(timeoutMs / 2))) {
      signals.push('FULFILLMENT_PROCESSING_WITHOUT_PROVIDER_REFERENCE');
    }
  }

  if (attemptCount >= 3 && !terminal) {
    signals.push('MULTIPLE_ATTEMPTS_ORDER_NOT_TERMINAL');
  }

  const st = checkout.status;
  if (
    os === ORDER_STATUS.PROCESSING &&
    st === PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING &&
    latestAttempt?.status === FULFILLMENT_ATTEMPT_STATUS.FAILED
  ) {
    signals.push('LAST_ATTEMPT_FAILED_ORDER_STILL_PROCESSING');
  }

  return [...new Set(signals)].sort();
}

/**
 * @param {import('@prisma/client').PaymentCheckout} checkout
 * @param {import('@prisma/client').FulfillmentAttempt | null | undefined} latestAttempt
 * @param {{ manualReviewRequired: boolean }} manualFlags
 * @returns {string} PHASE1_CANONICAL_PHASE value
 */
export function derivePhase1CanonicalPhase(checkout, latestAttempt, manualFlags) {
  if (manualFlags.manualReviewRequired) {
    return PHASE1_CANONICAL_PHASE.MANUAL_REVIEW;
  }
  const os = checkout.orderStatus ?? ORDER_STATUS.PENDING;

  if (os === ORDER_STATUS.CANCELLED) {
    return PHASE1_CANONICAL_PHASE.CANCELLED;
  }
  if (os === ORDER_STATUS.FAILED) {
    return PHASE1_CANONICAL_PHASE.FAILED;
  }
  if (os === ORDER_STATUS.FULFILLED || os === ORDER_STATUS.DELIVERED) {
    return PHASE1_CANONICAL_PHASE.DELIVERED;
  }

  if (os === ORDER_STATUS.PROCESSING) {
    return PHASE1_CANONICAL_PHASE.FULFILLMENT_IN_PROGRESS;
  }

  if (os === ORDER_STATUS.PAID) {
    return PHASE1_CANONICAL_PHASE.PAID_FULFILLMENT_PENDING;
  }

  return PHASE1_CANONICAL_PHASE.AWAITING_PAYMENT;
}

/**
 * @param {object} p
 * @param {string} p.canonicalPhase
 * @param {string[]} p.financialAnomalyCodes
 * @param {string[]} p.stuckSignals
 * @param {{ manualReviewRequired: boolean, manualReviewReason: string | null }} p.manual
 * @param {import('@prisma/client').PaymentCheckout} p.checkout
 * @param {import('@prisma/client').FulfillmentAttempt | null | undefined} p.latestAttempt
 */
export function buildPhase1LifecycleSummary(p) {
  const { canonicalPhase, financialAnomalyCodes, stuckSignals, manual, checkout, latestAttempt } =
    p;

  let headline = canonicalPhase.replace(/_/g, ' ');
  let detail = '';
  let supportNarrative = '';

  switch (canonicalPhase) {
    case PHASE1_CANONICAL_PHASE.AWAITING_PAYMENT:
      headline = 'Awaiting customer payment';
      detail = 'Checkout created; Stripe session may be open or unpaid.';
      supportNarrative =
        'Payment has not been confirmed. If the customer paid, check Stripe for PaymentIntent/Session and webhook delivery.';
      break;
    case PHASE1_CANONICAL_PHASE.PAID_FULFILLMENT_PENDING:
      headline = 'Paid; fulfillment pending start';
      detail = 'Funds captured; airtime delivery not finished or not started yet.';
      supportNarrative =
        'Payment succeeded. Fulfillment should move from queued to processing — check fulfillment worker and provider logs.';
      break;
    case PHASE1_CANONICAL_PHASE.FULFILLMENT_IN_PROGRESS:
      headline = 'Fulfillment in progress';
      detail = 'Order is with the airtime provider path (processing).';
      supportNarrative =
        'Provider dispatch in flight. Use provider reference and fulfillment attempt rows to confirm delivery.';
      break;
    case PHASE1_CANONICAL_PHASE.DELIVERED:
      headline = 'Delivered';
      detail = 'Order reached terminal success (airtime delivery recorded).';
      supportNarrative =
        'Completed path. Verify financial anomaly codes and margin fields for finance review.';
      break;
    case PHASE1_CANONICAL_PHASE.FAILED:
      headline = 'Failed';
      detail = checkout.failureReason
        ? `Terminal failure: ${checkout.failureReason}`
        : 'Terminal failure.';
      supportNarrative =
        'Order did not complete delivery. Check failureReason, fulfillment attempts, and Stripe (refund/dispute are manual in Phase 1).';
      break;
    case PHASE1_CANONICAL_PHASE.CANCELLED:
      headline = 'Cancelled';
      detail = 'Checkout or order cancelled before completion.';
      supportNarrative = 'No delivery expected. Confirm no charge or refund via Stripe if needed.';
      break;
    case PHASE1_CANONICAL_PHASE.MANUAL_REVIEW:
      headline = 'Manual review required';
      detail = manual.manualReviewReason
        ? `Flagged: ${manual.manualReviewReason}`
        : 'Flagged for operator review (metadata).';
      supportNarrative =
        'Automated path could not safely complete. Review audits, provider evidence, and Stripe.';
      break;
    default:
      detail = 'Unknown phase — inspect raw orderStatus and status fields.';
      supportNarrative = 'Use lifecycleStatus, paymentStatus, and fulfillment attempt rows.';
  }

  if (financialAnomalyCodes.length > 0) {
    detail = `${detail} Financial flags: ${financialAnomalyCodes.join(', ')}.`;
  }
  if (stuckSignals.length > 0) {
    detail = `${detail} Operational signals: ${stuckSignals.join(', ')}.`;
  }

  const att = latestAttempt?.attemptNumber;
  if (att != null) {
    supportNarrative = `${supportNarrative} Latest fulfillment attempt number: ${att}.`;
  }

  return {
    canonicalPhase,
    headline,
    detail: detail.trim(),
    supportNarrative: supportNarrative.trim(),
  };
}
