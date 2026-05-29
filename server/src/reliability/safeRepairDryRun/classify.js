import { createRepairPlan, REPAIR_CLASS } from './types.js';

/** CORE-08 operator phrase for Class C (apply is NOT enabled in v1). */
export const CORE08_APPROVAL_PHRASE = 'APPROVE CORE-08 SAFE REPAIR APPLY ONLY';

/**
 * @param {import('./signals.js').RepairSignal} signal
 * @param {number} index
 * @returns {import('./types.js').RepairPlan}
 */
export function classifyRepairSignal(signal, index = 0) {
  const planId = `CORE8-PLAN-${signal.signalType.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}-${String(index + 1).padStart(3, '0')}`;
  const base = {
    planId,
    sourceFindingId: signal.sourceFindingId ?? signal.signalType,
    invariantIds: signal.invariantIds ?? [],
    affectedEntityIds: signal.entityIds,
    evidence: signal.evidence ?? {},
    severity: /** @type {import('./types.js').PlanSeverity} */ (signal.severity ?? 'high'),
  };

  switch (signal.signalType) {
    case 'missing_audit_metadata':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.B_METADATA_CANDIDATE,
        severity: 'medium',
        recommendedAction: 'backfill_audit_metadata_candidate_dry_run_only',
        approvalRequired: false,
        rollbackPlan: 'delete_or_archive_backfilled_audit_metadata_rows',
        evidenceRequiredBeforeApply: [
          'audit_gap_list',
          'operator_second_ack',
          'dry_run_diff',
        ],
      });

    case 'stale_pending_review':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.B_METADATA_CANDIDATE,
        severity: 'medium',
        recommendedAction: 'flag_stale_pending_for_ops_review_metadata_only',
        approvalRequired: false,
        rollbackPlan: 'clear_stale_pending_flag_metadata',
        evidenceRequiredBeforeApply: ['stale_age_ms', 'order_status_snapshot'],
      });

    case 'paid_provider_missing':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
        severity: 'critical',
        recommendedAction: 'reconcile_payment_and_provider_before_any_delivery_claim',
        approvalRequired: true,
        rollbackPlan: 'revert_order_status_and_cancel_pending_provider_dispatch',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: [
          'payment_proof',
          'provider_state_reconciliation',
          'signed_incident_dr',
        ],
      });

    case 'provider_timeout_ambiguous':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
        severity: 'high',
        recommendedAction: 'manual_provider_reconciliation_before_status_change',
        approvalRequired: true,
        rollbackPlan: 'hold_order_processing_no_fulfilled_transition',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: [
          'provider_status_proof',
          'no_duplicate_reference',
        ],
      });

    case 'provider_retry_after_ambiguous':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.D_FORBIDDEN,
        severity: 'critical',
        recommendedAction: 'forbid_auto_provider_retry_after_ambiguous_response',
        approvalRequired: true,
        rollbackPlan: 'n/a_auto_retry_forbidden_use_operator_runbook',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: [
          'provider_reconciliation_complete',
          'separate_provider_retry_dr',
        ],
      });

    case 'duplicate_provider_execution':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.D_FORBIDDEN,
        severity: 'critical',
        recommendedAction: 'forbid_auto_repair_on_duplicate_provider_execution_risk',
        approvalRequired: true,
        rollbackPlan: 'halt_dispatch_investigate_duplicate_reference',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: [
          'idempotency_registry_proof',
          'duplicate_reference_analysis',
        ],
      });

    case 'missing_idempotency_key':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.D_FORBIDDEN,
        severity: 'high',
        recommendedAction: 'forbid_auto_repair_without_canonical_idempotency_key',
        approvalRequired: false,
        rollbackPlan: 'n/a_do_not_apply_until_key_material_valid',
        evidenceRequiredBeforeApply: ['valid_idempotency_key_material'],
      });

    case 'completed_without_provider_proof':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
        severity: 'critical',
        recommendedAction: 'fail_closed_investigate_fulfilled_without_provider_proof',
        approvalRequired: true,
        rollbackPlan: 'revert_fulfilled_claim_pending_provider_proof',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: [
          'provider_reference_or_success_proof',
          'no_customer_delivery_claim_until_resolved',
        ],
      });

    case 'refund_candidate':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
        severity: 'critical',
        recommendedAction: 'refund_requires_separate_money_path_approval',
        approvalRequired: true,
        rollbackPlan: 'document_refund_reversal_if_erroneously_issued',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: ['l11_refund_dr', 'payment_intent_state', 'no_double_refund'],
      });

    case 'wallet_correction_candidate':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
        severity: 'critical',
        recommendedAction: 'wallet_correction_requires_finance_approval',
        approvalRequired: true,
        rollbackPlan: 'ledger_adjustment_reversal_plan',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: ['wallet_ledger_snapshot', 'signed_finance_dr'],
      });

    case 'provider_retry':
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
        severity: 'high',
        recommendedAction: 'provider_retry_requires_explicit_approval_and_new_idempotency_key',
        approvalRequired: true,
        rollbackPlan: 'cancel_retry_if_duplicate_reference_detected',
        operatorApprovalPhrase: CORE08_APPROVAL_PHRASE,
        evidenceRequiredBeforeApply: [
          'prior_attempt_outcome',
          'new_idempotency_key',
          'core05_classify_allow',
        ],
      });

    default:
      return createRepairPlan({
        ...base,
        repairClass: REPAIR_CLASS.A_DETECT_ONLY,
        severity: 'info',
        recommendedAction: 'detect_only_no_repair_plan',
        approvalRequired: false,
        rollbackPlan: 'n/a',
        evidenceRequiredBeforeApply: [],
      });
  }
}
