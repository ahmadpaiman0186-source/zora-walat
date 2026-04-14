/** Machine codes for web top-up (session-key) JSON errors. */
export const WEBTOPUP_CLIENT_ERROR_CODE = Object.freeze({
  PAYMENT_INTENT_IDEMPOTENCY_REQUIRED: 'payment_intent_idempotency_required',
  /** Missing or wrong `X-ZW-WebTopup-Session` when `orderId` is set on create-payment-intent. */
  ORDER_SESSION_INVALID: 'webtopup_order_session_invalid',
  /** Stripe PI was created but DB row could not attach `paymentIntentId` (race or invariant). */
  TOPUP_ORDER_PI_LINK_FAILED: 'topup_order_pi_link_failed',
  /** PI object from Stripe missing expected `metadata.topup_order_id` for an order-bound create. */
  PAYMENT_INTENT_METADATA_MISMATCH: 'payment_intent_metadata_mismatch',
  /** POST mark-paid: need `sessionKey` in body or `Authorization` for a user-bound order. */
  MARK_PAID_SESSION_OR_AUTH_REQUIRED: 'webtopup_mark_paid_session_or_auth_required',
  TOPUP_ORDER_IDEMPOTENCY_REQUIRED: 'topup_order_idempotency_required',
  TOPUP_ORDER_IDEMPOTENCY_CONFLICT: 'topup_order_idempotency_conflict',
  WEBTOPUP_MARK_PAID_DISABLED: 'webtopup_client_mark_paid_disabled',
  VALIDATION_ERROR: 'validation_error',
  TOPUP_ORDER_NOT_FOUND: 'topup_order_not_found',
  TOPUP_ORDER_FORBIDDEN: 'topup_order_forbidden',
  TOPUP_ORDER_CANNOT_UPDATE: 'topup_order_cannot_update',
  TOPUP_ORDER_CONCURRENT_UPDATE: 'topup_order_concurrent_update',
  TOPUP_ORDER_PI_MISMATCH: 'topup_order_pi_mismatch',
  TOPUP_ORDER_PAYMENT_VERIFICATION_FAILED: 'topup_order_payment_verification_failed',
  INVALID_PAYMENT_INTENT_ID: 'invalid_payment_intent_id',
  /** GET list or get: need `sessionKey` or `Authorization: Bearer`. */
  SESSION_OR_AUTH_REQUIRED: 'webtopup_session_or_auth_required',
});
