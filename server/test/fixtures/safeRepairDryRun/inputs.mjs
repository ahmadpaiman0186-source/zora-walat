/**
 * CORE-08 dry-run repair planner fixtures (a–j).
 */

export const missingAuditMetadata = {
  signals: [
    {
      signalType: 'missing_audit_metadata',
      sourceFindingId: 'CORE4-AUD-001',
      invariantIds: ['INV-05'],
      entityIds: { orderId: 'ord_audit_1' },
      severity: 'medium',
    },
  ],
};

export const stalePendingOrder = {
  signals: [
    {
      signalType: 'stale_pending_review',
      sourceFindingId: 'CORE4-STALE-001',
      invariantIds: ['INV-03'],
      entityIds: { orderId: 'ord_stale_1' },
      severity: 'high',
    },
  ],
};

export const paidProviderMissing = {
  deliveryDecisions: [
    {
      code: 'CORE6-PAID-NO-PRV-001',
      decision: 'PENDING_REVIEW',
      severity: 'critical',
      invariantIds: ['INV-02', 'INV-03'],
      requiredNextAction: 'reconcile',
      mutationAllowed: false,
      entityIds: { orderId: 'ord_paid_no_prv' },
    },
  ],
};

export const providerTimeoutAmbiguous = {
  signals: [
    {
      signalType: 'provider_timeout_ambiguous',
      sourceFindingId: 'CORE4-AMB-001',
      invariantIds: ['INV-06'],
      severity: 'high',
    },
  ],
};

export const duplicateProviderExecution = {
  idempotencyDecisions: [
    {
      code: 'CORE5-DUP-PRVEXEC-001',
      decision: 'BLOCK_DUPLICATE',
      severity: 'critical',
      invariantIds: ['INV-01'],
      requiredNextAction: 'reject',
      mutationAllowed: false,
      entityIds: { orderId: 'ord_dup_prv' },
    },
  ],
};

export const missingIdempotencyKey = {
  idempotencyDecisions: [
    {
      code: 'CORE5-KEY-001',
      decision: 'BLOCK_AMBIGUOUS',
      severity: 'high',
      invariantIds: ['INV-01'],
      requiredNextAction: 'supply_key',
      mutationAllowed: false,
    },
  ],
};

export const completedWithoutProviderProof = {
  deliveryDecisions: [
    {
      code: 'CORE6-FULFILLED-NO-REF-001',
      decision: 'BLOCK_AMBIGUOUS',
      severity: 'critical',
      invariantIds: ['INV-04'],
      requiredNextAction: 'investigate',
      mutationAllowed: false,
      entityIds: { orderId: 'ord_fulfilled_bad' },
    },
  ],
};

export const refundCandidate = {
  signals: [
    {
      signalType: 'refund_candidate',
      sourceFindingId: 'INC-REFUND-001',
      invariantIds: ['INV-03'],
      severity: 'critical',
      entityIds: { orderId: 'ord_refund_cand' },
    },
  ],
};

export const walletCorrectionCandidate = {
  signals: [
    {
      signalType: 'wallet_correction_candidate',
      sourceFindingId: 'INC-WALLET-001',
      invariantIds: ['INV-03'],
      severity: 'critical',
      entityIds: { walletId: 'wal_corr_1' },
    },
  ],
};

export const cleanNoRepair = {
  findings: [],
  idempotencyDecisions: [],
  deliveryDecisions: [],
  signals: [],
};
