/**
 * CORE-06 no-pay-no-service runtime proof — delivery decision schema (no mutations).
 */

export const PROOF_SCHEMA_VERSION = 1;

/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} ProofSeverity */

/**
 * @typedef {'ALLOW_DELIVERY' | 'BLOCK_NO_PAYMENT' | 'BLOCK_NO_PROVIDER_PROOF' | 'BLOCK_AMBIGUOUS' | 'PENDING_REVIEW' | 'FAIL_CLOSED'} DeliveryDecisionType
 */

export const DELIVERY_DECISION = Object.freeze({
  ALLOW_DELIVERY: 'ALLOW_DELIVERY',
  BLOCK_NO_PAYMENT: 'BLOCK_NO_PAYMENT',
  BLOCK_NO_PROVIDER_PROOF: 'BLOCK_NO_PROVIDER_PROOF',
  BLOCK_AMBIGUOUS: 'BLOCK_AMBIGUOUS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  FAIL_CLOSED: 'FAIL_CLOSED',
});

/**
 * @typedef {object} PaymentProof
 * @property {boolean} [stripePaid]
 * @property {boolean} [paymentIntentConfirmed]
 * @property {boolean} [checkoutSessionPaid]
 * @property {boolean} [webhookPaymentReceived]
 * @property {string} [orderStatus]
 * @property {boolean} [paymentFailed]
 */

/**
 * @typedef {object} ProviderProof
 * @property {boolean} [hasSuccessProof]
 * @property {string} [providerReference]
 * @property {boolean} [providerExecuted]
 * @property {boolean} [ambiguous]
 * @property {boolean} [timeout]
 * @property {string} [lastAttemptStatus]
 */

/**
 * @typedef {object} OrderDeliveryProof
 * @property {string} [orderStatus]
 * @property {boolean} [serviceDeliveredFlag]
 * @property {boolean} [fulfillmentScheduled]
 */

/**
 * @typedef {object} AuditProof
 * @property {string[]} [requiredEvents]
 * @property {string[]} [presentEvents]
 */

/**
 * @typedef {object} IdempotencySafetyProof
 * @property {boolean} [duplicateRisk]
 * @property {boolean} [ambiguousKey]
 * @property {boolean} [idempotencyConflict]
 */

/**
 * @typedef {object} NoPayNoServiceProofBundle
 * @property {Record<string, string>} entityIds
 * @property {PaymentProof} [payment]
 * @property {ProviderProof} [provider]
 * @property {OrderDeliveryProof} [order]
 * @property {AuditProof} [audit]
 * @property {IdempotencySafetyProof} [idempotency]
 * @property {{ isSandbox?: boolean, nonMoneyProof?: boolean, proofLabel?: string }} [sandbox]
 * @property {{ staleAgeMs?: number, staleThresholdMs?: number }} [pending]
 */

/**
 * @typedef {object} DeliveryProofDecision
 * @property {string} code
 * @property {DeliveryDecisionType} decision
 * @property {ProofSeverity} severity
 * @property {string[]} invariantIds
 * @property {string} requiredNextAction
 * @property {boolean} mutationAllowed
 * @property {Record<string, string>} [entityIds]
 * @property {Record<string, unknown>} [evidence]
 * @property {string[]} [missingEvidence]
 * @property {string} [confidence]
 */

/**
 * @param {Partial<DeliveryProofDecision> & Pick<DeliveryProofDecision, 'code' | 'decision' | 'severity' | 'requiredNextAction'>} p
 * @returns {DeliveryProofDecision}
 */
export function createDeliveryDecision(p) {
  return {
    invariantIds: p.invariantIds ?? [],
    mutationAllowed: false,
    confidence: p.confidence ?? 'high',
    entityIds: p.entityIds,
    evidence: p.evidence ?? {},
    missingEvidence: p.missingEvidence ?? [],
    ...p,
    mutationAllowed: false,
  };
}

/**
 * @param {DeliveryProofDecision} decision
 */
export function buildProofReport(decision, evaluatedAt = new Date().toISOString()) {
  const blocked = [
    DELIVERY_DECISION.BLOCK_NO_PAYMENT,
    DELIVERY_DECISION.BLOCK_NO_PROVIDER_PROOF,
    DELIVERY_DECISION.BLOCK_AMBIGUOUS,
    DELIVERY_DECISION.FAIL_CLOSED,
  ].includes(decision.decision);

  let verdict = 'PASS';
  if (blocked && (decision.severity === 'critical' || decision.severity === 'high')) {
    verdict = 'FAIL';
  } else if (decision.decision === DELIVERY_DECISION.PENDING_REVIEW || blocked) {
    verdict = 'WARN';
  }

  return {
    schemaVersion: PROOF_SCHEMA_VERSION,
    evaluatedAt,
    mode: 'no_pay_no_service_proof',
    classifyOnly: true,
    autoRepairApplyEnabled: false,
    decision,
    verdict,
    safety: {
      classify_only: true,
      never_mark_delivered_in_module: true,
      db_writes: false,
      external_api_calls: false,
      payment_mutations: false,
      provider_execution: false,
    },
  };
}
