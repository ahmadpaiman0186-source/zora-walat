/**
 * CORE-05 duplicate transaction / idempotency control kernel — decision schema (no mutations).
 */

export const KERNEL_SCHEMA_VERSION = 1;

/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} KernelSeverity */

/**
 * @typedef {'ALLOW' | 'BLOCK_DUPLICATE' | 'BLOCK_AMBIGUOUS' | 'PENDING_REVIEW' | 'RETRY_SAFE' | 'RETRY_UNSAFE'} IdempotencyDecisionType
 */

export const DECISION = Object.freeze({
  ALLOW: 'ALLOW',
  BLOCK_DUPLICATE: 'BLOCK_DUPLICATE',
  BLOCK_AMBIGUOUS: 'BLOCK_AMBIGUOUS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  RETRY_SAFE: 'RETRY_SAFE',
  RETRY_UNSAFE: 'RETRY_UNSAFE',
});

/**
 * @typedef {object} IdempotencyDecision
 * @property {string} code — stable decision code (e.g. CORE5-DUP-CHK-001)
 * @property {IdempotencyDecisionType} decision
 * @property {KernelSeverity} severity
 * @property {string[]} invariantIds
 * @property {string} [idempotencyKey] — canonical key when known
 * @property {string} [requiredNextAction] — human/ops action (never auto-applied)
 * @property {boolean} mutationAllowed — always false in CORE-05 v1
 * @property {string} [attemptKind]
 * @property {Record<string, string>} [entityIds]
 * @property {Record<string, unknown>} [evidence]
 * @property {string} [confidence] — high | medium | low
 */

/**
 * @param {Partial<IdempotencyDecision> & Pick<IdempotencyDecision, 'code' | 'decision' | 'severity' | 'requiredNextAction'>} p
 * @returns {IdempotencyDecision}
 */
export function createDecision(p) {
  return {
    invariantIds: p.invariantIds ?? [],
    mutationAllowed: false,
    confidence: p.confidence ?? 'high',
    entityIds: p.entityIds,
    evidence: p.evidence ?? {},
    idempotencyKey: p.idempotencyKey,
    attemptKind: p.attemptKind,
    ...p,
    mutationAllowed: false,
  };
}

/**
 * @param {IdempotencyDecision[]} decisions
 */
export function buildKernelReport(decisions, evaluatedAt = new Date().toISOString()) {
  const blocked = decisions.filter((d) =>
    ['BLOCK_DUPLICATE', 'BLOCK_AMBIGUOUS', 'RETRY_UNSAFE'].includes(d.decision),
  );
  const review = decisions.filter((d) => d.decision === 'PENDING_REVIEW');
  let verdict = 'PASS';
  if (blocked.some((d) => d.severity === 'critical' || d.severity === 'high')) verdict = 'FAIL';
  else if (blocked.length > 0 || review.length > 0) verdict = 'WARN';

  return {
    schemaVersion: KERNEL_SCHEMA_VERSION,
    evaluatedAt,
    mode: 'classify_only',
    classifyOnly: true,
    autoRepairApplyEnabled: false,
    decisions,
    verdict,
    safety: {
      classify_only: true,
      auto_repair_apply_enabled: false,
      db_writes: false,
      external_api_calls: false,
      payment_mutations: false,
      provider_execution: false,
    },
  };
}
