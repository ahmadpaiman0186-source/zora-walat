/**
 * L7 failure classification — maps signals/codes/messages to severity, retry policy, and safe recovery hints.
 * Pure logic; no I/O. Does not mutate money state.
 */

/** @typedef {'info' | 'warn' | 'critical'} ReliabilitySeverity */

/** @typedef {'none' | 'degraded' | 'blocked'} MoneyPathImpact */

/**
 * @typedef {Object} FailureClassification
 * @property {string} failureClass
 * @property {ReliabilitySeverity} severity
 * @property {boolean} retryable
 * @property {string} safeRecoveryAction
 * @property {boolean} requiresHumanReview
 * @property {MoneyPathImpact} moneyPathImpact
 */

export const FAILURE_CLASS = Object.freeze({
  STRIPE_WEBHOOK_SIGNATURE_INVALID: 'STRIPE_WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_TRUTH_REJECTED: 'WEBHOOK_TRUTH_REJECTED',
  PAYMENT_STATE_STUCK: 'PAYMENT_STATE_STUCK',
  LEDGER_UNBALANCED: 'LEDGER_UNBALANCED',
  LEDGER_POST_FAILED: 'LEDGER_POST_FAILED',
  FULFILLMENT_STALE_PROCESSING: 'FULFILLMENT_STALE_PROCESSING',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMIT: 'PROVIDER_RATE_LIMIT',
  PROVIDER_AUTH_FAILURE: 'PROVIDER_AUTH_FAILURE',
  FRAUD_HIGH_RISK_BLOCKED: 'FRAUD_HIGH_RISK_BLOCKED',
  DB_UNAVAILABLE: 'DB_UNAVAILABLE',
  REDIS_UNAVAILABLE: 'REDIS_UNAVAILABLE',
  UNKNOWN_MONEY_PATH_FAILURE: 'UNKNOWN_MONEY_PATH_FAILURE',
});

const SAFE_ACTION = Object.freeze({
  NONE: 'none',
  MONITOR: 'monitor',
  REPLAY_IDEMPOTENT_WEBHOOK: 'replay_idempotent_webhook',
  SCHEDULE_FULFILLMENT_REDISPATCH: 'schedule_fulfillment_redispatch',
  PROVIDER_RETRY_WITH_BACKOFF: 'provider_retry_with_backoff',
  OPERATOR_LEDGER_RECONCILE: 'operator_ledger_reconcile',
  OPERATOR_MONEY_PATH_REVIEW: 'operator_money_path_review',
  FAIL_CLOSED_HALT_AUTOMATION: 'fail_closed_halt_automation',
  VERIFY_CREDENTIALS: 'verify_credentials',
  EXPECTED_DENY: 'expected_deny',
});

/**
 * @param {unknown} input
 * @returns {input is Record<string, unknown>}
 */
function isObj(input) {
  return input !== null && typeof input === 'object';
}

/**
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
function normStr(input, key) {
  const v = input[key];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Classify a failure from an error, security event, or structured signal.
 *
 * @param {Record<string, unknown>} [input]
 * @returns {FailureClassification}
 */
export function classifyFailure(input = {}) {
  const signal = normStr(input, 'signal').toLowerCase();
  const code = normStr(input, 'code');
  const message = normStr(input, 'message').toLowerCase();
  const source = normStr(input, 'source').toLowerCase();

  const combined = `${signal} ${code} ${message} ${source}`;

  if (
    signal === 'stripe_webhook_signature_invalid' ||
    code === 'stripe_webhook_signature_invalid' ||
    combined.includes('stripe_webhook_signature_invalid') ||
    (code === 'stripe_signature_invalid' && source.includes('webhook'))
  ) {
    return {
      failureClass: FAILURE_CLASS.STRIPE_WEBHOOK_SIGNATURE_INVALID,
      severity: 'critical',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.MONITOR,
      requiresHumanReview: false,
      moneyPathImpact: 'none',
    };
  }

  if (
    signal === 'webhook_truth_rejected' ||
    code === 'webhook_truth_rejected' ||
    (combined.includes('webhook_truth') && combined.includes('reject'))
  ) {
    return {
      failureClass: FAILURE_CLASS.WEBHOOK_TRUTH_REJECTED,
      severity: 'critical',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.OPERATOR_MONEY_PATH_REVIEW,
      requiresHumanReview: true,
      moneyPathImpact: 'blocked',
    };
  }

  if (
    signal === 'payment_state_stuck' ||
    code === 'payment_state_stuck' ||
    code === 'paid_idle' ||
    (combined.includes('stuck') && combined.includes('paid'))
  ) {
    return {
      failureClass: FAILURE_CLASS.PAYMENT_STATE_STUCK,
      severity: 'warn',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.OPERATOR_MONEY_PATH_REVIEW,
      requiresHumanReview: true,
      moneyPathImpact: 'degraded',
    };
  }

  if (
    signal === 'ledger_unbalanced' ||
    code === 'ledger_unbalanced' ||
    (combined.includes('ledger') && combined.includes('unbalanced'))
  ) {
    return {
      failureClass: FAILURE_CLASS.LEDGER_UNBALANCED,
      severity: 'critical',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.OPERATOR_LEDGER_RECONCILE,
      requiresHumanReview: true,
      moneyPathImpact: 'blocked',
    };
  }

  if (
    signal === 'ledger_post_failed' ||
    code === 'ledger_post_failed' ||
    (combined.includes('ledger') &&
      combined.includes('post') &&
      combined.includes('fail'))
  ) {
    const transient =
      combined.includes('timeout') ||
      combined.includes('econnreset') ||
      code === 'p2024';
    return {
      failureClass: FAILURE_CLASS.LEDGER_POST_FAILED,
      severity: transient ? 'warn' : 'critical',
      retryable: transient,
      safeRecoveryAction: transient
        ? SAFE_ACTION.PROVIDER_RETRY_WITH_BACKOFF
        : SAFE_ACTION.OPERATOR_LEDGER_RECONCILE,
      requiresHumanReview: !transient,
      moneyPathImpact: transient ? 'degraded' : 'blocked',
    };
  }

  if (
    signal === 'fulfillment_stale_processing' ||
    code === 'fulfillment_stale_processing' ||
    code === 'stale_processing'
  ) {
    return {
      failureClass: FAILURE_CLASS.FULFILLMENT_STALE_PROCESSING,
      severity: 'warn',
      retryable: true,
      safeRecoveryAction: SAFE_ACTION.SCHEDULE_FULFILLMENT_REDISPATCH,
      requiresHumanReview: false,
      moneyPathImpact: 'degraded',
    };
  }

  if (
    signal === 'provider_timeout' ||
    code === 'provider_timeout' ||
    code === 'etimedout' ||
    (message.includes('timeout') &&
      (source.includes('provider') || source.includes('reloadly')))
  ) {
    return {
      failureClass: FAILURE_CLASS.PROVIDER_TIMEOUT,
      severity: 'warn',
      retryable: true,
      safeRecoveryAction: SAFE_ACTION.PROVIDER_RETRY_WITH_BACKOFF,
      requiresHumanReview: false,
      moneyPathImpact: 'degraded',
    };
  }

  if (
    signal === 'provider_rate_limit' ||
    code === 'provider_rate_limit' ||
    code === 'provider_rate_limit_regime' ||
    combined.includes('rate_limit') ||
    combined.includes('429')
  ) {
    return {
      failureClass: FAILURE_CLASS.PROVIDER_RATE_LIMIT,
      severity: 'warn',
      retryable: true,
      safeRecoveryAction: SAFE_ACTION.PROVIDER_RETRY_WITH_BACKOFF,
      requiresHumanReview: false,
      moneyPathImpact: 'degraded',
    };
  }

  if (
    signal === 'provider_auth_failure' ||
    code === 'provider_auth_failure' ||
    code === 'reloadly_not_configured' ||
    (combined.includes('auth') && source.includes('provider')) ||
    message.includes('invalid api key') ||
    message.includes('unauthorized')
  ) {
    return {
      failureClass: FAILURE_CLASS.PROVIDER_AUTH_FAILURE,
      severity: 'critical',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.VERIFY_CREDENTIALS,
      requiresHumanReview: true,
      moneyPathImpact: 'blocked',
    };
  }

  if (
    signal === 'fraud_high_risk_blocked' ||
    code === 'fraud_high_risk_blocked' ||
    (combined.includes('fraud') && combined.includes('block'))
  ) {
    return {
      failureClass: FAILURE_CLASS.FRAUD_HIGH_RISK_BLOCKED,
      severity: 'info',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.EXPECTED_DENY,
      requiresHumanReview: false,
      moneyPathImpact: 'none',
    };
  }

  if (
    signal === 'db_unavailable' ||
    code === 'db_unavailable' ||
    code === 'p1001' ||
    combined.includes("can't reach database") ||
    combined.includes('database server')
  ) {
    return {
      failureClass: FAILURE_CLASS.DB_UNAVAILABLE,
      severity: 'critical',
      retryable: false,
      safeRecoveryAction: SAFE_ACTION.FAIL_CLOSED_HALT_AUTOMATION,
      requiresHumanReview: true,
      moneyPathImpact: 'blocked',
    };
  }

  if (
    signal === 'redis_unavailable' ||
    code === 'redis_unavailable' ||
    (combined.includes('redis') && combined.includes('econnrefused'))
  ) {
    return {
      failureClass: FAILURE_CLASS.REDIS_UNAVAILABLE,
      severity: 'warn',
      retryable: true,
      safeRecoveryAction: SAFE_ACTION.PROVIDER_RETRY_WITH_BACKOFF,
      requiresHumanReview: false,
      moneyPathImpact: 'degraded',
    };
  }

  return {
    failureClass: FAILURE_CLASS.UNKNOWN_MONEY_PATH_FAILURE,
    severity: 'warn',
    retryable: false,
    safeRecoveryAction: SAFE_ACTION.OPERATOR_MONEY_PATH_REVIEW,
    requiresHumanReview: true,
    moneyPathImpact: 'degraded',
  };
}

/**
 * @param {unknown} err
 * @param {{ source?: string }} [ctx]
 * @returns {FailureClassification}
 */
export function classifyFailureFromError(err, ctx = {}) {
  const o = isObj(err) ? /** @type {Record<string, unknown>} */ (err) : {};
  const code = typeof o.code === 'string' ? o.code : '';
  const message = err instanceof Error ? err.message : String(err ?? '');
  return classifyFailure({
    code,
    message,
    source: ctx.source ?? 'error',
  });
}

export { SAFE_ACTION };
