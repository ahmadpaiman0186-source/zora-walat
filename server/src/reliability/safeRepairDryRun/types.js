/**
 * CORE-08 safe repair dry-run engine — repair plan schema (no apply, no mutations).
 */

export const DRY_RUN_SCHEMA_VERSION = 1;

/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} PlanSeverity */

/**
 * @typedef {'A_DETECT_ONLY' | 'B_METADATA_CANDIDATE' | 'C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER' | 'D_FORBIDDEN'} RepairClassCode
 */

export const REPAIR_CLASS = Object.freeze({
  A_DETECT_ONLY: 'A_DETECT_ONLY',
  B_METADATA_CANDIDATE: 'B_METADATA_CANDIDATE',
  C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER: 'C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER',
  D_FORBIDDEN: 'D_FORBIDDEN',
});

/**
 * @typedef {object} RepairPlan
 * @property {string} planId
 * @property {string} sourceFindingId
 * @property {string[]} invariantIds
 * @property {RepairClassCode} repairClass
 * @property {PlanSeverity} severity
 * @property {Record<string, string>} [affectedEntityIds]
 * @property {Record<string, unknown>} [evidence]
 * @property {string} recommendedAction
 * @property {boolean} approvalRequired
 * @property {string} rollbackPlan
 * @property {boolean} mutationAllowed — always false
 * @property {boolean} applyAvailable — always false
 * @property {string[]} evidenceRequiredBeforeApply
 * @property {string} [operatorApprovalPhrase]
 */

/**
 * @param {Partial<RepairPlan> & Pick<RepairPlan, 'planId' | 'sourceFindingId' | 'repairClass' | 'severity' | 'recommendedAction' | 'approvalRequired' | 'rollbackPlan'>} p
 * @returns {RepairPlan}
 */
export function createRepairPlan(p) {
  return {
    invariantIds: p.invariantIds ?? [],
    affectedEntityIds: p.affectedEntityIds,
    evidence: p.evidence ?? {},
    evidenceRequiredBeforeApply: p.evidenceRequiredBeforeApply ?? [],
    operatorApprovalPhrase: p.operatorApprovalPhrase,
    ...p,
    mutationAllowed: false,
    applyAvailable: false,
  };
}

/**
 * @typedef {object} DryRunRepairReport
 * @property {number} schemaVersion
 * @property {string} plannedAt
 * @property {string} mode — dry_run_only
 * @property {boolean} dryRunOnly
 * @property {boolean} autoRepairApplyEnabled — always false
 * @property {RepairPlan[]} plans
 * @property {'PASS' | 'WARN' | 'FAIL'} verdict
 */

/**
 * @param {import('./types.js').RepairPlan[]} plans
 */
export function buildDryRunReport(plans, plannedAt = new Date().toISOString()) {
  const hasForbidden = plans.some((p) => p.repairClass === REPAIR_CLASS.D_FORBIDDEN);
  const hasApproval = plans.some(
    (p) => p.repairClass === REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
  );
  let verdict = 'PASS';
  if (hasForbidden || plans.some((p) => p.severity === 'critical' && p.approvalRequired)) {
    verdict = 'FAIL';
  } else if (hasApproval || plans.length > 0) {
    verdict = 'WARN';
  }

  return {
    schemaVersion: DRY_RUN_SCHEMA_VERSION,
    plannedAt,
    mode: 'dry_run_only',
    dryRunOnly: true,
    autoRepairApplyEnabled: false,
    plans,
    verdict,
    safety: {
      dry_run_only: true,
      apply_available: false,
      auto_repair_apply_enabled: false,
      db_writes: false,
      external_api_calls: false,
      provider_retry: false,
      refund_execution: false,
      payment_mutations: false,
    },
  };
}
