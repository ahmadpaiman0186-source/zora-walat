/**
 * Phase 1 payment completion linkage — documents and validates how Stripe Checkout
 * maps to `PaymentCheckout` rows. Used for reconciliation and webhook hardening.
 *
 * Source of truth for “money captured for this order” in Phase 1:
 * - Stripe: `checkout.session.completed` (signed webhook)
 * - DB: `PaymentCheckout` transition to PAID + `completedByWebhookEventId` + `stripePaymentIntentId`
 *
 * @see applyPhase1CheckoutSessionCompleted
 */

/**
 * @param {{ stripeCheckoutSessionId?: string | null }} row
 * @param {{ id?: string }} session — Stripe Checkout Session object
 * @returns {{ ok: true, stripeSessionId: string } | { ok: false, reason: string, securityEvent?: string }}
 */
export function evaluateStripeCheckoutSessionRowIntegrity(row, session) {
  const stripeSessionId =
    session && typeof session.id === 'string' && session.id.length > 0 ? session.id : null;
  if (!stripeSessionId) {
    return {
      ok: false,
      reason: 'missing_stripe_checkout_session_id',
      securityEvent: 'webhook_checkout_session_missing_id',
    };
  }

  const persisted = row?.stripeCheckoutSessionId;
  if (typeof persisted === 'string' && persisted.length > 0 && persisted !== stripeSessionId) {
    return {
      ok: false,
      reason: 'stripe_checkout_session_id_mismatch',
      securityEvent: 'webhook_stripe_session_mismatch',
    };
  }

  return { ok: true, stripeSessionId };
}

/**
 * Embedded in `supportCorrelationChecklist.paymentCompletionTruth` — single source for DTO + tests.
 */
export function buildPhase1PaymentCompletionTruthBlock() {
  return {
    schemaVersion: 1,
    authoritativeStripeEventType: 'checkout.session.completed',
    correlationMetadataKey: 'metadata.internalCheckoutId → PaymentCheckout.id',
    dbFieldsProvingCompletion: [
      'completedByWebhookEventId (evt_…)',
      'stripePaymentIntentId (pi_…)',
      'stripeCheckoutSessionId (cs_…)',
      'orderStatus=PAID',
      'status=PAYMENT_SUCCEEDED',
    ],
    sessionRowIntegrity:
      'Webhook session.id must match PaymentCheckout.stripeCheckoutSessionId when the latter is set at session creation',
    duplicateEventSafety: 'StripeWebhookEvent.id unique; replay returns 200 without double-pay',
  };
}
