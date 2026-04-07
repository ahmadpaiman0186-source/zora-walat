import { FINANCIAL_ANOMALY } from '../constants/financialAnomaly.js';

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
 * }} p
 */
export function buildSupportCorrelationChecklist(p) {
  const id = typeof p.checkoutId === 'string' ? p.checkoutId : '';
  const suffix = id.length > 12 ? id.slice(-12) : id;
  return {
    apiOwnerPhase1Truth: `GET /api/orders/${id}/phase1-truth`,
    apiStaffOrderHealth: `GET /api/admin/ops/order-health?id=${encodeURIComponent(id)}`,
    apiStaffSupportFullTrace: `GET /api/admin/support/order/${encodeURIComponent(id)}/full-trace`,
    apiStaffPhase1Report: 'GET /api/admin/ops/phase1-report',
    logSearch: 'Filter logs: phase1Ops JSON and X-Trace-Id from the checkout session',
    stripeObjects: {
      paymentIntentId: p.stripePaymentIntentId ?? null,
      checkoutSessionId: p.stripeCheckoutSessionId ?? null,
      webhookEventIdThatCompleted: p.completedByStripeWebhookEventId ?? null,
    },
    orderIdSuffixForTickets: suffix || null,
  };
}
