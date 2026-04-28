import { FINANCIAL_ANOMALY } from '../constants/financialAnomaly.js';
import { buildPhase1PaymentCompletionTruthBlock } from './paymentCompletionLinkage.js';
import { buildFulfillmentExecutionTruthBlock } from './fulfillmentExecutionTruth.js';
import { buildProviderExecutionEvidenceBlock } from './providerExecutionCorrelation.js';

/** Short, ticket-ready lines for support (parallel to `financialAnomalyCodes`). */
const ANOMALY_LINE = {
  [FINANCIAL_ANOMALY.LOW_MARGIN]: 'LOW_MARGIN: Net margin after Stripe fee and provider cost is below internal target.',
  [FINANCIAL_ANOMALY.NEGATIVE_MARGIN]: 'NEGATIVE_MARGIN: Recorded economics show a loss on this order — finance review.',
  [FINANCIAL_ANOMALY.STRIPE_FEE_DIVERGENCE]: 'STRIPE_FEE_DIVERGENCE: Actual Stripe fee differs materially from estimate — reconcile in Stripe balance tx.',
  [FINANCIAL_ANOMALY.STRIPE_AMOUNT_MISMATCH]: 'STRIPE_AMOUNT_MISMATCH: Balance transaction amount does not match checkout — reconciliation risk.',
  [FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING]:
    'PROVIDER_REFERENCE_MISSING: Delivered or processing without a provider reference — traceability gap.',
  [FINANCIAL_ANOMALY.PROVIDER_COST_UNVERIFIED]:
    'PROVIDER_COST_UNVERIFIED: Provider cost not verified from API — margin uses estimates.',
};

/**
 * One line per anomaly code (unknown codes get a generic line).
 * @param {string[]} codes
 * @returns {string[]}
 */
export function financialAnomalySupportLines(codes) {
  if (!Array.isArray(codes)) return [];
  return codes.map((c) => {
    if (typeof c !== 'string' || !c.trim()) return '';
    const line = ANOMALY_LINE[c.trim()];
    return line ?? `Financial flag ${c} — see FINANCIAL_ANOMALY / financialTruthService.`;
  }).filter(Boolean);
}

/**
 * Stable checklist for correlating an order (no PII).
 * @param {{
 *   checkoutId: string,
 *   stripePaymentIntentId: string | null,
 *   stripeCheckoutSessionId: string | null,
 *   completedByStripeWebhookEventId: string | null,
 *   fulfillmentAttemptId?: string | null,
 *   latestProviderReference?: string | null,
 * }} p
 */
export function buildSupportCorrelationChecklist(p) {
  const id = typeof p.checkoutId === 'string' ? p.checkoutId : '';
  const suffix = id.length > 12 ? id.slice(-12) : id;
  return {
    apiOwnerPhase1Truth: `GET /api/orders/${id}/phase1-truth`,
    apiStaffOrderHealth: `GET /api/admin/ops/order-health?id=${encodeURIComponent(id)}`,
    apiOpsInfraHealth: 'GET /ops/health (db/redis/queue flags)',
    apiStaffPhase1AggregatedHealth: 'GET /api/admin/ops/phase1-aggregated-health',
    apiStaffSupportFullTrace: `GET /api/admin/support/order/${encodeURIComponent(id)}/full-trace`,
    apiStaffPhase1Report: 'GET /api/admin/ops/phase1-report',
    logSearch: 'Filter logs: phase1Ops JSON and X-Trace-Id from the checkout session',
    stripeObjects: {
      paymentIntentId: p.stripePaymentIntentId ?? null,
      checkoutSessionId: p.stripeCheckoutSessionId ?? null,
      webhookEventIdThatCompleted: p.completedByStripeWebhookEventId ?? null,
    },
    /** Reconciliation: how paid state is anchored (Phase 1 mobile top-up Checkout). */
    paymentCompletionTruth: buildPhase1PaymentCompletionTruthBlock(),
    /** Execution: how paid orders move to provider I/O without duplicate external side-effects. */
    fulfillmentExecutionTruth: buildFulfillmentExecutionTruthBlock(),
    /** Provider attempt ↔ correlation id ↔ reference (when attempt exists). */
    providerExecutionEvidence: buildProviderExecutionEvidenceBlock({
      checkoutId: id,
      fulfillmentAttemptId: p.fulfillmentAttemptId ?? null,
      latestProviderReference: p.latestProviderReference ?? null,
    }),
    /** Answers common operator questions without opening another tool (no PII). */
    operatorTraceLookupGuide: {
      whoPaid:
        'Stripe: PaymentIntent / Checkout Session for ids under stripeObjects; DB: PaymentCheckout.userId + PAID/PAYMENT_SUCCEEDED fields in paymentCompletionTruth.',
      whichOrder: 'PaymentCheckout.id (this checklist checkoutId; also internalCheckoutId in Stripe metadata).',
      whichFulfillmentAttempt:
        'FulfillmentAttempt rows for orderId=checkoutId; attempt #1 created with checkout.session.completed; see fulfillmentExecutionTruth.',
      whichProviderIdentity:
        'providerExecutionEvidence.reloadlyCustomIdentifierWhenReloadly + providerExecutionCorrelationId (same attempt row as zwr_ id).',
      wasProviderDispatchSent:
        'FulfillmentAttempt.status progression QUEUED→PROCESSING→…; requestSummary/responseSummary JSON; providerReference when Reloadly returns a reference.',
      whatWasProviderResponse:
        'FulfillmentAttempt.responseSummary (JSON) + providerReference; cross-check Reloadly dashboard by customIdentifier.',
      replayOrDuplicated:
        'paymentCompletionTruth.duplicateEventSafety + fulfillmentExecutionTruth.duplicatePaymentWebhookSafety + providerExecutionEvidence.singleExecutionNote.',
      secondWorkerInvocation:
        'After terminal attempt (SUCCEEDED/FAILED) or order terminal: second processFulfillmentForOrder is a no-op at orchestration (no QUEUED claim). Concurrent workers: only one wins QUEUED→PROCESSING (see transactionFortressConcurrency integration). Sandbox proof script runs an optional second invoke when attempt is terminal.',
      safeNextAction:
        'If stuck PROCESSING: use apiStaffSupportFullTrace + phase1-report; if PAID without attempt: replay signed checkout.session.completed is safe; do not hand-retry POST without a new attempt row.',
    },
    orderIdSuffixForTickets: suffix || null,
  };
}
