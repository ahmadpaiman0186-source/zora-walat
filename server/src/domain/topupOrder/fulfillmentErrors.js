/** Service / API stable codes for web top-up fulfillment. */
export const FULFILLMENT_SERVICE_CODE = {
  ORDER_NOT_FOUND: 'order_not_found',
  NOT_PAID: 'not_paid',
  INVALID_STATE: 'invalid_fulfillment_state',
  DUPLICATE_DISPATCH: 'duplicate_dispatch',
  PROVIDER_NOT_CONFIGURED: 'provider_not_configured',
  PROVIDER_UNSUPPORTED: 'provider_unsupported_route',
  PROVIDER_ERROR: 'provider_error',
  /** Reloadly: AF airtime order but operatorKey cannot be mapped to a Reloadly operatorId. */
  OPERATOR_MAPPING_MISSING: 'operator_mapping_missing',
  /** Kill switch or config suspended fulfillment (no provider call). */
  FULFILLMENT_SUSPENDED: 'fulfillment_suspended',
  /** Same Idempotency-Key already has an in-flight fulfillment attempt. */
  IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
  /** Pre-dispatch financial evaluation failed (see `guardrailCode` on thrown errors / `fulfillmentErrorCode`). */
  FINANCIAL_GUARDRAIL: 'financial_guardrail_blocked',
};

/** Persisted on `fulfillmentErrorCode` when {@link FULFILLMENT_SERVICE_CODE.FINANCIAL_GUARDRAIL} blocks dispatch. */
export const FINANCIAL_GUARDRAIL_CODES = Object.freeze({
  UNPAID: 'unpaid_order_dispatch_blocked',
  INVALID_AMOUNT: 'invalid_amount',
  UNSUPPORTED_CURRENCY: 'unsupported_currency',
  CONTRADICTORY: 'contradictory_financial_state',
  DAILY_CAP: 'financial_daily_cap_exceeded',
  GENERIC: 'financial_guardrail_blocked',
});

/** @type {ReadonlySet<string>} */
const FINANCIAL_GUARDRAIL_CODE_SET = new Set(Object.values(FINANCIAL_GUARDRAIL_CODES));

/**
 * @param {string | null | undefined} code
 * @returns {boolean}
 */
export function isWebTopupFinancialGuardrailErrorCode(code) {
  if (code == null || typeof code !== 'string') return false;
  return FINANCIAL_GUARDRAIL_CODE_SET.has(code.trim());
}

/** Stored in DB `fulfillmentErrorCode` for failed attempts (subset). */
export const FULFILLMENT_DB_ERROR = {
  RETRYABLE: 'retryable',
  TERMINAL: 'terminal',
  UNSUPPORTED_ROUTE: 'unsupported_route',
  INVALID_PRODUCT: 'invalid_product',
  AMOUNT_MISMATCH: 'amount_mismatch',
  /** Reloadly (or other) accepted request but delivery not proven yet — not a user fault. */
  PROVIDER_VERIFYING: 'provider_verifying',
};
