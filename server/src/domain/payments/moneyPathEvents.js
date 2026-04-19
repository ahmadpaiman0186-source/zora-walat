/**
 * Stable money-path event names for logs, metrics agents, and ops grep.
 * Do not rename lightly — dashboards and runbooks may key off these strings.
 */
export const MONEY_PATH_EVENT = Object.freeze({
  /** Stripe HTTP ingress (before signature verification). */
  WEBHOOK_HTTP_RECEIVED: 'webhook_http_received',
  WEBHOOK_VERIFIED: 'webhook_verified',
  WEBHOOK_VERIFY_FAILED: 'webhook_verify_failed',
  /** PaymentIntent created for embedded / web top-up (server accepted Stripe response). */
  PAYMENT_INTENT_CREATED: 'payment_intent_created',
  /** Terminal payment success path (webhook or async reconciliation). */
  PAYMENT_CONFIRMED: 'payment_confirmed',
  /** Fulfillment work accepted onto async path (BullMQ or inline fallback scheduled). */
  FULFILLMENT_QUEUED: 'fulfillment_queued',
  FULFILLMENT_DISPATCH_START: 'fulfillment_dispatch_start',
  FULFILLMENT_SUCCESS: 'fulfillment_success',
  FULFILLMENT_FAILURE: 'fulfillment_failure',
  /** Classifier output — safe to log; must not include PANs or secrets. */
  RETRY_DECISION: 'retry_decision',
  /** Phase 1 Stripe Checkout session row created (hosted checkout URL returned). */
  CHECKOUT_SESSION_CREATED: 'checkout_session_created',
  /** Marketing WebTopupOrder persisted (POST /api/topup-orders). */
  WEBTOPUP_ORDER_CREATED: 'webtopup_order_created',
  /** Client poll path requested (optional; env-gated). */
  WEBTOPUP_MARK_PAID_REQUESTED: 'webtopup_mark_paid_requested',
  /** Client poll path completed order row update. */
  WEBTOPUP_MARK_PAID_COMPLETED: 'webtopup_mark_paid_completed',
  /**
   * Risk engine outcome (deny/review/allow). Safe fields only — see `logRiskDecision`.
   * Grep alongside `securityEvent: risk_decision` in pino logs.
   */
  RISK_DECISION: 'risk_decision',
});
