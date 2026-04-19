/**
 * Failure severity + policy (super-system decision plane).
 * Used for structured logs, watchdog rollup, and operator visibility — not a substitute for domain validation.
 */

import {
  FAILURE_CATEGORY_EXPLICIT,
  classifyErrorToExplicitCategory,
} from './failureModel.js';

/** @typedef {'low_transient' | 'medium_degraded' | 'high_requires_review' | 'critical_terminal'} FailureSeverity */

export const FAILURE_SEVERITY = Object.freeze({
  LOW_TRANSIENT: 'low_transient',
  MEDIUM_DEGRADED: 'medium_degraded',
  HIGH_REQUIRES_REVIEW: 'high_requires_review',
  CRITICAL_TERMINAL: 'critical_terminal',
});

/**
 * Policy hints for automation (retry/failover/async/deny) — orthogonal to HTTP response.
 * @typedef {{ retry: boolean, failover: boolean, asyncRecovery: boolean, deny: boolean, manualReview: boolean, terminal: boolean }} SeverityPolicy
 */

const POLICY_LOW = Object.freeze({
  retry: true,
  failover: true,
  asyncRecovery: true,
  deny: false,
  manualReview: false,
  terminal: false,
});

const POLICY_MEDIUM = Object.freeze({
  retry: true,
  failover: false,
  asyncRecovery: true,
  deny: false,
  manualReview: false,
  terminal: false,
});

const POLICY_HIGH = Object.freeze({
  retry: false,
  failover: false,
  asyncRecovery: false,
  deny: false,
  manualReview: true,
  terminal: false,
});

const POLICY_CRITICAL = Object.freeze({
  retry: false,
  failover: false,
  asyncRecovery: false,
  deny: true,
  manualReview: false,
  terminal: true,
});

/**
 * @param {FailureSeverity} severity
 * @returns {SeverityPolicy}
 */
export function policyForSeverity(severity) {
  switch (severity) {
    case FAILURE_SEVERITY.LOW_TRANSIENT:
      return POLICY_LOW;
    case FAILURE_SEVERITY.MEDIUM_DEGRADED:
      return POLICY_MEDIUM;
    case FAILURE_SEVERITY.HIGH_REQUIRES_REVIEW:
      return POLICY_HIGH;
    case FAILURE_SEVERITY.CRITICAL_TERMINAL:
      return POLICY_CRITICAL;
    default:
      return POLICY_MEDIUM;
  }
}

/**
 * Static reference for `/ready` + logs — same rules as {@link policyForSeverity}.
 * @type {Readonly<Record<FailureSeverity, SeverityPolicy>>}
 */
export const OPERATOR_SEVERITY_POLICY_REFERENCE = Object.freeze({
  [FAILURE_SEVERITY.LOW_TRANSIENT]: POLICY_LOW,
  [FAILURE_SEVERITY.MEDIUM_DEGRADED]: POLICY_MEDIUM,
  [FAILURE_SEVERITY.HIGH_REQUIRES_REVIEW]: POLICY_HIGH,
  [FAILURE_SEVERITY.CRITICAL_TERMINAL]: POLICY_CRITICAL,
});

/**
 * Circuit deny / hard-stop outcomes must not look "reviewable" when the system is refusing work.
 * @param {Record<string, unknown> | null | undefined} payload
 * @param {SeverityPolicy} policy
 * @returns {SeverityPolicy}
 */
export function mergePolicyForReliabilityOutcome(payload, policy) {
  const outcome = payload && typeof payload === 'object' ? payload.outcome : undefined;
  const reason = payload && typeof payload === 'object' ? payload.reason : undefined;
  if (outcome === 'deny' || reason === 'circuit_open') {
    return {
      ...policy,
      retry: false,
      failover: false,
      asyncRecovery: false,
      deny: true,
      manualReview: false,
      terminal: false,
    };
  }
  return policy;
}

/**
 * @param {unknown} err
 * @param {{ surface?: string, inDbTransaction?: boolean }} [ctx]
 * @returns {FailureSeverity}
 */
export function classifyFailureSeverityFromError(err, ctx = {}) {
  const cat = classifyErrorToExplicitCategory(err);
  if (ctx.inDbTransaction) {
    if (cat === FAILURE_CATEGORY_EXPLICIT.NETWORK_FAILURE) {
      return FAILURE_SEVERITY.MEDIUM_DEGRADED;
    }
  }
  if (cat === FAILURE_CATEGORY_EXPLICIT.BUSINESS_FAILURE) {
    return FAILURE_SEVERITY.CRITICAL_TERMINAL;
  }
  if (cat === FAILURE_CATEGORY_EXPLICIT.INTERNAL_FAILURE) {
    return FAILURE_SEVERITY.HIGH_REQUIRES_REVIEW;
  }
  if (cat === FAILURE_CATEGORY_EXPLICIT.DEGRADED_PERFORMANCE) {
    return FAILURE_SEVERITY.MEDIUM_DEGRADED;
  }
  if (cat === FAILURE_CATEGORY_EXPLICIT.NETWORK_FAILURE) {
    return FAILURE_SEVERITY.LOW_TRANSIENT;
  }
  if (cat === FAILURE_CATEGORY_EXPLICIT.PROVIDER_FAILURE) {
    return FAILURE_SEVERITY.LOW_TRANSIENT;
  }
  return FAILURE_SEVERITY.MEDIUM_DEGRADED;
}

/**
 * @param {string} explicitCategory
 * @returns {FailureSeverity}
 */
export function classifyFailureSeverityFromExplicitCategory(explicitCategory) {
  switch (explicitCategory) {
    case FAILURE_CATEGORY_EXPLICIT.NETWORK_FAILURE:
      return FAILURE_SEVERITY.LOW_TRANSIENT;
    case FAILURE_CATEGORY_EXPLICIT.PROVIDER_FAILURE:
      return FAILURE_SEVERITY.LOW_TRANSIENT;
    case FAILURE_CATEGORY_EXPLICIT.BUSINESS_FAILURE:
      return FAILURE_SEVERITY.CRITICAL_TERMINAL;
    case FAILURE_CATEGORY_EXPLICIT.INTERNAL_FAILURE:
      return FAILURE_SEVERITY.HIGH_REQUIRES_REVIEW;
    case FAILURE_CATEGORY_EXPLICIT.DEGRADED_PERFORMANCE:
      return FAILURE_SEVERITY.MEDIUM_DEGRADED;
    default:
      return FAILURE_SEVERITY.MEDIUM_DEGRADED;
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @param {unknown} [err]
 * @param {{ inDbTransaction?: boolean }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function enrichReliabilityDecisionWithSeverity(payload, err, ctx = {}) {
  if (err == null && payload && payload.outcome === 'ok') {
    return {
      ...payload,
      failureSeverity: FAILURE_SEVERITY.LOW_TRANSIENT,
      policy: policyForSeverity(FAILURE_SEVERITY.LOW_TRANSIENT),
    };
  }
  const severity =
    err != null
      ? classifyFailureSeverityFromError(err, ctx)
      : FAILURE_SEVERITY.MEDIUM_DEGRADED;
  const basePolicy = policyForSeverity(severity);
  return {
    ...payload,
    failureSeverity: severity,
    policy: mergePolicyForReliabilityOutcome(payload, basePolicy),
  };
}
