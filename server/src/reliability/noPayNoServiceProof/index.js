/**
 * CORE-06 no-pay-no-service runtime proof kernel (classify-only, no mutations).
 * Not wired into live checkout/payment/provider/webhook paths.
 */

export {
  auditGap,
  hasIdempotencyRisk,
  hasPaymentProof,
  hasProviderSuccessProof,
  isSandboxNonMoneyProof,
  providerIsAmbiguous,
} from './proofEvaluators.js';
export {
  evaluateNoPayNoServiceBatch,
  evaluateNoPayNoServiceDelivery,
} from './evaluateDelivery.js';
export { deliveryDecisionToDoctorFinding } from './doctorExport.js';
export {
  buildProofReport,
  createDeliveryDecision,
  DELIVERY_DECISION,
  PROOF_SCHEMA_VERSION,
} from './types.js';
