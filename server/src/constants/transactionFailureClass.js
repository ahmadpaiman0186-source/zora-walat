/**
 * Transaction / money-path failure taxonomy for retries, logs, and support.
 * Narrower than HTTP — drives "retry vs stop" policy at orchestration boundaries.
 */
export const TRANSACTION_FAILURE_CLASS = Object.freeze({
  TRANSIENT_DB: 'TRANSIENT_DB',
  TRANSIENT_STRIPE: 'TRANSIENT_STRIPE',
  TRANSIENT_PROVIDER: 'TRANSIENT_PROVIDER',
  PERMANENT_VALIDATION: 'PERMANENT_VALIDATION',
  PERMANENT_PAYMENT_MISMATCH: 'PERMANENT_PAYMENT_MISMATCH',
  PERMANENT_DUPLICATE_BLOCKED: 'PERMANENT_DUPLICATE_BLOCKED',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  UNKNOWN: 'UNKNOWN',
});

/**
 * @param {unknown} err
 * @param {{ surface?: string, stripeEventType?: string | null }} [ctx]
 * @returns {string} TRANSACTION_FAILURE_CLASS value
 */
export function classifyTransactionFailure(err, ctx = {}) {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
  const code =
    err && typeof err === 'object' && 'code' in err && err.code != null
      ? String(err.code)
      : '';
  const msg = String(err?.message ?? err ?? '').toLowerCase();

  if (code === 'PROVIDER_CIRCUIT_OPEN' || code === 'PROVIDER_RATE_LIMIT_REGIME') {
    return TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER;
  }

  if (code === 'P2002') {
    return TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED;
  }
  if (code === 'P2025') {
    return TRANSACTION_FAILURE_CLASS.PERMANENT_VALIDATION;
  }
  if (code === 'P2024' || code === 'P2034') {
    return TRANSACTION_FAILURE_CLASS.TRANSIENT_DB;
  }
  if (/timeout|deadlock|could not serialize/i.test(msg) || code === 'P2031') {
    return TRANSACTION_FAILURE_CLASS.TRANSIENT_DB;
  }

  if (
    name.includes('Stripe') ||
    /stripe|payment_intent/.test(msg) ||
    ctx.surface === 'stripe_webhook'
  ) {
    if (/rate limit|429|connection|econnreset|socket|timeout/.test(msg)) {
      return TRANSACTION_FAILURE_CLASS.TRANSIENT_STRIPE;
    }
    if (/invalid|no such|mismatch|amount|currency/.test(msg)) {
      return TRANSACTION_FAILURE_CLASS.PERMANENT_PAYMENT_MISMATCH;
    }
  }

  if (
    /reloadly|provider|topup|operator|route/.test(msg) ||
    ctx.surface === 'provider'
  ) {
    if (/rate limit|429|timeout|econnreset|503|502/.test(msg)) {
      return TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER;
    }
  }

  if (/manual_review|manual required|sandbox_duplicate_send_guard/.test(msg)) {
    return TRANSACTION_FAILURE_CLASS.MANUAL_REVIEW_REQUIRED;
  }

  return TRANSACTION_FAILURE_CLASS.UNKNOWN;
}

/**
 * @param {string} transactionFailureClass
 * @returns {boolean}
 */
export function isTransientTransactionFailureClass(transactionFailureClass) {
  return (
    transactionFailureClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_DB ||
    transactionFailureClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_STRIPE ||
    transactionFailureClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER
  );
}
