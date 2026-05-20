/**
 * Zora-Walat Super-System Control Plane — shared types (no secrets).
 */

/** @typedef {'PASS'|'WARN'|'PARTIAL'|'BLOCKED'|'CRITICAL'|'NOT_IMPLEMENTED'} InvariantStatus */

/** @typedef {'high'|'medium'|'low'} Confidence */

/** @typedef {'diagnose_only'|'propose_repair'|'safe_local_fix'|'approval_required'|'forbidden'} ActionMode */

/** @typedef {'low'|'medium'|'high'} DangerLevel */

/**
 * @typedef {object} InvariantResult
 * @property {string} id
 * @property {InvariantStatus} status
 * @property {Confidence} confidence
 * @property {string} evidence
 * @property {string} risk
 * @property {string} proposed_next_action
 * @property {boolean} approval_required
 * @property {string} [category]
 */

/**
 * @typedef {object} RepairProposal
 * @property {string} id
 * @property {string} title
 * @property {InvariantStatus} classification
 * @property {ActionMode} action_mode
 * @property {DangerLevel} danger
 * @property {boolean} approval_required
 * @property {string[]} steps
 * @property {string} [related_invariant]
 * @property {boolean} [forbidden_auto]
 */

/**
 * @typedef {object} ZwDoctorReport
 * @property {string} version
 * @property {string} mode
 * @property {string} timestamp
 * @property {InvariantStatus} verdict
 * @property {InvariantResult[]} invariants
 * @property {RepairProposal[]} proposals
 * @property {Record<string, number>} summary
 */

export const ZW_DOCTOR_VERSION = '1.0.0';

export const INVARIANT_CATEGORIES = Object.freeze({
  MONEY_PATH: 'money_path',
  FRONTEND: 'frontend',
  CONFIG_SECURITY: 'config_security',
  OPERATIONAL: 'operational',
});

export const FAILURE_LEVEL = Object.freeze({
  PASS: 'PASS',
  WARN: 'WARN',
  PARTIAL: 'PARTIAL',
  BLOCKED: 'BLOCKED',
  CRITICAL: 'CRITICAL',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
});

export const ACTION_MODE = Object.freeze({
  DIAGNOSE_ONLY: 'diagnose_only',
  PROPOSE_REPAIR: 'propose_repair',
  SAFE_LOCAL_FIX: 'safe_local_fix',
  APPROVAL_REQUIRED: 'approval_required',
  FORBIDDEN: 'forbidden',
});

/**
 * @param {Partial<InvariantResult> & Pick<InvariantResult, 'id'|'status'>} fields
 * @returns {InvariantResult}
 */
export function invariant(fields) {
  return {
    id: fields.id,
    status: fields.status,
    confidence: fields.confidence ?? 'medium',
    evidence: fields.evidence ?? '',
    risk: fields.risk ?? '',
    proposed_next_action: fields.proposed_next_action ?? '',
    approval_required: fields.approval_required === true,
    category: fields.category,
  };
}

/**
 * @param {InvariantResult[]} invariants
 */
export function summarizeInvariants(invariants) {
  /** @type {Record<string, number>} */
  const summary = {
    PASS: 0,
    WARN: 0,
    PARTIAL: 0,
    BLOCKED: 0,
    CRITICAL: 0,
    NOT_IMPLEMENTED: 0,
    total: invariants.length,
  };
  for (const r of invariants) {
    summary[r.status] = (summary[r.status] ?? 0) + 1;
  }
  return summary;
}

/**
 * @param {InvariantResult[]} invariants
 * @returns {InvariantStatus}
 */
export function computeVerdict(invariants) {
  if (invariants.some((r) => r.status === 'CRITICAL')) return 'CRITICAL';
  if (invariants.some((r) => r.status === 'BLOCKED')) return 'BLOCKED';
  if (invariants.some((r) => r.status === 'NOT_IMPLEMENTED')) return 'PARTIAL';
  if (invariants.some((r) => r.status === 'PARTIAL')) return 'PARTIAL';
  if (invariants.some((r) => r.status === 'WARN')) return 'WARN';
  return 'PASS';
}

/**
 * @param {InvariantStatus} verdict
 * @param {boolean} strict
 */
export function exitCodeForVerdict(verdict, strict) {
  if (!strict) return 0;
  return verdict === 'CRITICAL' || verdict === 'BLOCKED' ? 1 : 0;
}
