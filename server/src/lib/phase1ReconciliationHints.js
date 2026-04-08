/**
 * Lightweight, durable triage hints for reconciliation workflows (not a full recon service).
 * Safe JSON only — no secrets; safe to log at `info` with checkout id suffixing upstream.
 */
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { parseManualReviewFlags } from '../services/canonicalPhase1Lifecycle.js';

export const PHASE1_RECONCILIATION_HINTS_SCHEMA =
  'zora.phase1.reconciliation_hints.v1 terminal_questions.v1';

/**
 * @param {import('@prisma/client').PaymentCheckout} checkout
 * @param {Array<import('@prisma/client').FulfillmentAttempt>} [attempts] newest-first or any order (will sort)
 */
export function buildPhase1ReconciliationHints(checkout, attempts = []) {
  const manual = parseManualReviewFlags(checkout.metadata);
  const sorted = [...attempts].sort(
    (a, b) => Number(b.attemptNumber ?? 0) - Number(a.attemptNumber ?? 0),
  );
  const latest = sorted[0] ?? null;

  const paymentCaptured =
    checkout.status === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
    checkout.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING ||
    checkout.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED ||
    checkout.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED;

  const fulfillmentAttempted = sorted.length > 0;
  const latestNonTerminalAttempt =
    latest &&
    latest.status !== FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED &&
    latest.status !== FULFILLMENT_ATTEMPT_STATUS.FAILED;

  const orderTerminal =
    checkout.orderStatus === ORDER_STATUS.FULFILLED ||
    checkout.orderStatus === ORDER_STATUS.FAILED ||
    checkout.orderStatus === ORDER_STATUS.CANCELLED;

  const providerOutcomeKnown =
    checkout.orderStatus === ORDER_STATUS.FULFILLED ||
    (latest != null && latest.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) ||
    (checkout.fulfillmentProviderReference != null &&
      String(checkout.fulfillmentProviderReference).trim() !== '');

  /** Retry-safe: paid, not terminal success, no open manual gate — conservative. */
  const retryQueueSafe =
    paymentCaptured &&
    checkout.orderStatus !== ORDER_STATUS.FULFILLED &&
    checkout.orderStatus !== ORDER_STATUS.CANCELLED &&
    !manual.manualReviewRequired;

  const manualInterventionRequired =
    manual.manualReviewRequired ||
    (!orderTerminal &&
      checkout.orderStatus === ORDER_STATUS.PROCESSING &&
      latest?.status === FULFILLMENT_ATTEMPT_STATUS.FAILED);

  return {
    schema: PHASE1_RECONCILIATION_HINTS_SCHEMA,
    checkoutId: checkout.id,
    paymentCheckoutStatus: checkout.status,
    orderStatus: checkout.orderStatus,
    paymentCaptured,
    paidAt: checkout.paidAt ? checkout.paidAt.toISOString() : null,
    failureReason: checkout.failureReason ?? null,
    manualReviewRequired: manual.manualReviewRequired,
    manualReviewReason: manual.manualReviewReason,
    manualReviewClassification: manual.manualReviewClassification,
    fulfillmentAttemptSummary: sorted.slice(0, 25).map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      status: a.status,
      provider: a.provider ?? null,
      failureReason: a.failureReason ?? null,
      providerReference:
        a.providerReference != null ? String(a.providerReference).slice(0, 64) : null,
    })),
    evidence: {
      stripePaymentIntentId: checkout.stripePaymentIntentId ?? null,
      completedByWebhookEventId: checkout.completedByWebhookEventId ?? null,
      fulfillmentProviderReference: checkout.fulfillmentProviderReference ?? null,
      fulfillmentProviderKey: checkout.fulfillmentProviderKey ?? null,
    },
    triage: {
      customerPaid: paymentCaptured,
      fulfillmentAttempted,
      latestAttemptStatus: latest?.status ?? null,
      latestAttemptInFlight: Boolean(latestNonTerminalAttempt),
      providerOutcomeKnown,
      retryQueueSafe,
      manualInterventionRequired,
      orderLifecycleTerminal: orderTerminal,
    },
    divergenceRisks: buildDivergenceRiskTokens(checkout, sorted, paymentCaptured),
  };
}

/**
 * High-level buckets for runbooks (not exhaustive — expand in recon service later).
 */
function buildDivergenceRiskTokens(checkout, sorted, paymentCaptured) {
  /** @type {string[]} */
  const risks = [];
  if (
    paymentCaptured &&
    checkout.orderStatus === ORDER_STATUS.PENDING &&
    checkout.status !== PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING
  ) {
    risks.push('paid_signal_but_order_still_pending');
  }
  if (
    checkout.orderStatus === ORDER_STATUS.FULFILLED &&
    checkout.status !== PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED
  ) {
    risks.push('fulfilled_but_payment_status_not_recharge_completed');
  }
  if (checkout.orderStatus === ORDER_STATUS.PAID && sorted.length === 0) {
    risks.push('paid_without_any_fulfillment_attempt');
  }
  const latest = sorted[0];
  if (
    latest &&
    latest.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED &&
    checkout.orderStatus !== ORDER_STATUS.FULFILLED
  ) {
    risks.push('attempt_succeeded_but_order_not_fulfilled');
  }
  return risks;
}
