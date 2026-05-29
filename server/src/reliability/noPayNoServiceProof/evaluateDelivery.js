import {
  auditGap,
  hasIdempotencyRisk,
  hasPaymentProof,
  hasProviderSuccessProof,
  isSandboxNonMoneyProof,
  isStalePendingPaid,
  orderClaimsDelivered,
  providerIsAmbiguous,
} from './proofEvaluators.js';
import { createDeliveryDecision, DELIVERY_DECISION } from './types.js';

const STALE_DEFAULT_MS = 30 * 60 * 1000;

/**
 * Classify whether delivery may proceed (proof-only — never mutates or marks delivered).
 * @param {import('./types.js').NoPayNoServiceProofBundle} bundle
 * @returns {import('./types.js').DeliveryProofDecision}
 */
export function evaluateNoPayNoServiceDelivery(bundle) {
  const entityIds = bundle.entityIds ?? {};
  const base = { entityIds };

  if (isSandboxNonMoneyProof(bundle)) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-SANDBOX-ALLOW-001',
      decision: DELIVERY_DECISION.ALLOW_DELIVERY,
      severity: 'info',
      invariantIds: ['INV-02', 'INV-03'],
      requiredNextAction: 'sandbox_non_money_proof_classify_only',
      evidence: {
        sandbox: true,
        proofLabel: bundle.sandbox?.proofLabel ?? 'non_money_fixture',
      },
      confidence: 'high',
    });
  }

  const paid = hasPaymentProof(bundle.payment);
  const providerOk = hasProviderSuccessProof(bundle.provider);
  const deliveredClaim = orderClaimsDelivered(bundle.order);
  const ambiguous = providerIsAmbiguous(bundle.provider);
  const { missing: missingAudit } = auditGap(bundle.audit);
  const idemRisk = hasIdempotencyRisk(bundle.idempotency);

  if (deliveredClaim && !paid) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-NPAY-DELIVERED-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PAYMENT,
      severity: 'critical',
      invariantIds: ['INV-03'],
      requiredNextAction: 'revoke_delivery_claim_investigate_unpaid_service',
      missingEvidence: ['payment_proof'],
      evidence: { serviceDeliveredFlag: true, stripePaid: false },
    });
  }

  if (
    bundle.order?.orderStatus === 'FULFILLED' &&
    paid &&
    !bundle.provider?.providerReference
  ) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-FULFILLED-NO-REF-001',
      decision: DELIVERY_DECISION.BLOCK_AMBIGUOUS,
      severity: 'critical',
      invariantIds: ['INV-02', 'INV-04'],
      requiredNextAction: 'never_mark_delivered_investigate_missing_provider_reference',
      missingEvidence: ['provider_reference'],
      evidence: { orderStatus: 'FULFILLED' },
    });
  }

  if (deliveredClaim && !providerOk) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-NOPRV-DELIVERED-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PROVIDER_PROOF,
      severity: 'critical',
      invariantIds: ['INV-02'],
      requiredNextAction: 'never_mark_delivered_without_provider_proof',
      missingEvidence: ['provider_success_proof'],
      evidence: { orderStatus: bundle.order?.orderStatus },
    });
  }

  if (providerOk && !paid) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-PRV-NO-PAY-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PAYMENT,
      severity: 'critical',
      invariantIds: ['INV-03'],
      requiredNextAction: 'block_service_on_unpaid_provider_success_anomaly',
      missingEvidence: ['payment_proof'],
      evidence: { providerReference: bundle.provider?.providerReference },
    });
  }

  if (!paid && bundle.provider?.providerExecuted === true) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-EXEC-NO-PAY-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PAYMENT,
      severity: 'critical',
      invariantIds: ['INV-03'],
      requiredNextAction: 'halt_provider_path_payment_missing',
      missingEvidence: ['payment_proof'],
    });
  }

  if (ambiguous) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-PRV-AMBIG-001',
      decision: DELIVERY_DECISION.BLOCK_AMBIGUOUS,
      severity: 'high',
      invariantIds: ['INV-02', 'INV-06'],
      requiredNextAction: 'hold_delivery_pending_provider_reconciliation',
      evidence: {
        ambiguous: bundle.provider?.ambiguous,
        timeout: bundle.provider?.timeout,
        lastAttemptStatus: bundle.provider?.lastAttemptStatus,
      },
      confidence: 'medium',
    });
  }

  if (idemRisk) {
    const critical = bundle.idempotency?.duplicateRisk === true;
    return createDeliveryDecision({
      ...base,
      code: critical ? 'CORE6-IDEM-FAIL-001' : 'CORE6-IDEM-REVIEW-001',
      decision: critical ? DELIVERY_DECISION.FAIL_CLOSED : DELIVERY_DECISION.PENDING_REVIEW,
      severity: critical ? 'critical' : 'high',
      invariantIds: ['INV-01', 'INV-03'],
      requiredNextAction: critical
        ? 'fail_closed_duplicate_risk_do_not_deliver'
        : 'resolve_idempotency_before_delivery_review',
      missingEvidence: ['idempotency_safety'],
      evidence: { ...bundle.idempotency },
    });
  }

  if (
    isStalePendingPaid(bundle.payment, {
      staleAgeMs: bundle.pending?.staleAgeMs,
      staleThresholdMs: bundle.pending?.staleThresholdMs ?? STALE_DEFAULT_MS,
    })
  ) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-STALE-PENDING-001',
      decision: DELIVERY_DECISION.PENDING_REVIEW,
      severity: 'high',
      invariantIds: ['INV-03'],
      requiredNextAction: 'stale_processing_paid_order_ops_review',
      evidence: {
        orderStatus: 'PROCESSING',
        staleAgeMs: bundle.pending?.staleAgeMs,
      },
    });
  }

  if (paid && !providerOk && !bundle.provider?.providerExecuted) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-PAID-NO-PRV-001',
      decision: DELIVERY_DECISION.PENDING_REVIEW,
      severity: 'critical',
      invariantIds: ['INV-02', 'INV-03'],
      requiredNextAction: 'reconcile_payment_before_delivery_or_provider_dispatch',
      missingEvidence: ['provider_success_proof'],
      evidence: { stripePaid: true, orderStatus: bundle.payment?.orderStatus },
    });
  }

  if (paid && !providerOk && bundle.provider?.providerExecuted) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-PAID-PRV-MISSING-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PROVIDER_PROOF,
      severity: 'critical',
      invariantIds: ['INV-02'],
      requiredNextAction: 'provider_executed_without_success_proof_ops_review',
      missingEvidence: ['provider_success_proof'],
    });
  }

  if (missingAudit.length > 0) {
    const failClosed = paid && providerOk;
    return createDeliveryDecision({
      ...base,
      code: failClosed ? 'CORE6-AUDIT-FAIL-001' : 'CORE6-AUDIT-REVIEW-001',
      decision: failClosed ? DELIVERY_DECISION.FAIL_CLOSED : DELIVERY_DECISION.PENDING_REVIEW,
      severity: failClosed ? 'high' : 'medium',
      invariantIds: ['INV-05'],
      requiredNextAction: failClosed
        ? 'fail_closed_missing_audit_on_money_path'
        : 'backfill_audit_before_delivery_confirmation',
      missingEvidence: missingAudit.map((e) => `audit:${e}`),
      evidence: { missingAudit },
    });
  }

  if (bundle.payment?.paymentFailed === true && bundle.provider?.providerExecuted !== true) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-FAILED-NO-PRV-001',
      decision: DELIVERY_DECISION.FAIL_CLOSED,
      severity: 'info',
      invariantIds: ['INV-03'],
      requiredNextAction: 'no_delivery_on_failed_payment_fail_closed_ok',
      evidence: { paymentFailed: true, providerExecuted: false },
    });
  }

  if (!paid) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-NO-PAY-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PAYMENT,
      severity: 'high',
      invariantIds: ['INV-03'],
      requiredNextAction: 'block_delivery_until_payment_proof',
      missingEvidence: ['payment_proof'],
    });
  }

  if (!providerOk) {
    return createDeliveryDecision({
      ...base,
      code: 'CORE6-NO-PRV-001',
      decision: DELIVERY_DECISION.BLOCK_NO_PROVIDER_PROOF,
      severity: 'high',
      invariantIds: ['INV-02'],
      requiredNextAction: 'block_delivery_until_provider_proof',
      missingEvidence: ['provider_success_proof'],
    });
  }

  return createDeliveryDecision({
    ...base,
    code: 'CORE6-ALLOW-001',
    decision: DELIVERY_DECISION.ALLOW_DELIVERY,
    severity: 'info',
    invariantIds: ['INV-02', 'INV-03'],
    requiredNextAction: 'delivery_proof_satisfied_classify_only_not_applied',
    evidence: { paymentProof: true, providerProof: true, auditComplete: true },
  });
}

/**
 * @param {import('./types.js').NoPayNoServiceProofBundle[]} bundles
 */
export function evaluateNoPayNoServiceBatch(bundles) {
  return bundles.map((b) => evaluateNoPayNoServiceDelivery(b));
}
