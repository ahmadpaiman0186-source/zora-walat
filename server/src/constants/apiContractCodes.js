/**
 * Stable machine codes for API contract tests and client branching.
 * Auth OTP codes live in {@link AUTH_ERROR_CODE}; risk codes in {@link RISK_REASON_CODE}.
 */

/** Generic HTTP / framework */
export const API_CONTRACT_CODE = Object.freeze({
  NOT_FOUND: 'not_found',
  VALIDATION_ERROR: 'validation_error',
  INVALID_JSON_BODY: 'invalid_json_body',
  UNSUPPORTED_MEDIA_TYPE: 'unsupported_media_type',
  INTERNAL_ERROR: 'internal_error',
  /** Generic IP / endpoint rate limit (non–risk-scoped handlers). */
  RATE_LIMITED: 'rate_limited',
  /** Role / staff gate on authenticated routes. */
  AUTH_FORBIDDEN: 'auth_forbidden',
  /** `PAYMENTS_LOCKDOWN_MODE` — new checkouts / wallet top-up / money creation blocked. */
  PAYMENTS_LOCKDOWN: 'payments_lockdown',
  /** Stripe SDK errors surfaced to clients (non-production may include detail). */
  PAYMENT_PROVIDER_ERROR: 'payment_provider_error',
});

/** Legacy Phase-1 checkout order reads (`/api/orders/*`). */
export const ORDER_API_ERROR_CODE = Object.freeze({
  INVALID_ORDER_ID: 'order_invalid_id',
  INVALID_SESSION_ID: 'order_invalid_session_id',
  NOT_FOUND: 'not_found',
});

/** Recharge Phase-1 execute / order paths (`/api/recharge/*`). */
export const RECHARGE_ERROR_CODE = Object.freeze({
  PACKAGE_REQUIRED: 'recharge_package_required',
  INVALID_ORDER_ID: 'recharge_invalid_order_id',
  NOT_FOUND: 'not_found',
  PAYMENT_PENDING: 'recharge_payment_pending',
  ORDER_CANCELLED: 'recharge_order_cancelled',
  FULFILLMENT_NOT_AUTHORIZED: 'recharge_fulfillment_not_authorized',
  FULFILLMENT_TIMEOUT: 'recharge_fulfillment_timeout',
});

/**
 * Maps Sprint-3 “scenario” names to the primary `code` clients should branch on.
 * Use for contract tests — not every response includes every scenario.
 */
export const FAILURE_SCENARIO = Object.freeze({
  auth_required: 'auth_required',
  verification_required: 'auth_verification_required',
  otp_invalid: 'auth_otp_invalid',
  otp_expired: 'auth_otp_expired',
  otp_replay: 'auth_otp_replay',
  otp_locked: 'auth_otp_locked',
  rate_limited: 'rate_limited',
  auth_rate_limited: 'auth_rate_limited',
  risk_rate_limited: 'risk_rate_limited',
  risk_otp_abuse: 'risk_otp_abuse',
  payment_verification_failed: 'topup_order_payment_verification_failed',
  recharge_failure: 'recharge_fulfillment_not_authorized',
  provider_failure: 'payment_provider_error',
});

/**
 * Staff / admin / tooling routes — use {@link API_CONTRACT_CODE} when the semantics match
 * (e.g. `not_found`, `validation_error`, `internal_error`).
 */
export const INTERNAL_TOOLING_CODE = Object.freeze({
  STAFF_OPERATION_FAILED: 'staff_operation_failed',
  OPS_INTERNAL_ERROR: 'ops_internal_error',
  PROCESSING_MANUAL_FAILED: 'processing_manual_failed',
  /** DB row changed mid-operation (catch `conflict` from safe-retry). */
  PROCESSING_MANUAL_CONCURRENT_STATE: 'processing_manual_concurrent_state_change',
});
