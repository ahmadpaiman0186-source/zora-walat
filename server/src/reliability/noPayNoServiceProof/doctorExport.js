/**
 * CORE-06 → CORE-04 doctor finding export (read-only mapping; not wired into scanners).
 */

/**
 * @param {import('./types.js').DeliveryProofDecision} decision
 * @returns {import('../runtimeDoctor/types.js').DiagnosticFinding | null}
 */
export function deliveryDecisionToDoctorFinding(decision) {
  if (decision.decision === 'ALLOW_DELIVERY') return null;

  const severityMap = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  };

  const fmByCode = {
    'CORE6-NPAY-DELIVERED-001': 'FM-11',
    'CORE6-NOPRV-DELIVERED-001': 'FM-11',
    'CORE6-PRV-NO-PAY-001': 'FM-10',
    'CORE6-PAID-NO-PRV-001': 'FM-10',
    'CORE6-FULFILLED-NO-REF-001': 'FM-11',
    'CORE6-PRV-AMBIG-001': 'FM-03',
    'CORE6-STALE-PENDING-001': 'FM-10',
    'CORE6-AUDIT-FAIL-001': 'FM-13',
    'CORE6-AUDIT-REVIEW-001': 'FM-13',
  };

  return {
    id: decision.code.replace('CORE6-', 'CORE4-NPNS6-'),
    fmId: fmByCode[decision.code] ?? 'FM-10',
    invariantIds: decision.invariantIds,
    severity: severityMap[decision.severity] ?? 'high',
    repairClass: 'A',
    recommendation: decision.requiredNextAction,
    mutationAllowed: false,
    entityType: 'order',
    entityId: decision.entityIds?.orderId,
    evidence: {
      ...decision.evidence,
      core06Decision: decision.decision,
      missingEvidence: decision.missingEvidence,
    },
    confidence: decision.confidence ?? 'high',
  };
}
