/**
 * CORE-06 proof evaluators — pure evidence checks (no side effects).
 */

/**
 * @param {import('./types.js').PaymentProof} [payment]
 */
export function hasPaymentProof(payment) {
  if (!payment) return false;
  if (payment.paymentFailed === true) return false;
  return (
    payment.stripePaid === true ||
    payment.paymentIntentConfirmed === true ||
    payment.checkoutSessionPaid === true ||
    payment.webhookPaymentReceived === true
  );
}

/**
 * @param {import('./types.js').ProviderProof} [provider]
 */
export function hasProviderSuccessProof(provider) {
  if (!provider) return false;
  if (provider.ambiguous === true || provider.timeout === true) return false;
  if (provider.hasSuccessProof === true) return true;
  if (provider.providerReference && provider.lastAttemptStatus === 'SUCCESS') return true;
  return provider.providerReference != null && provider.providerReference.length > 0 && !provider.ambiguous;
}

/**
 * @param {import('./types.js').ProviderProof} [provider]
 */
export function providerIsAmbiguous(provider) {
  if (!provider) return false;
  return provider.ambiguous === true || provider.timeout === true || provider.lastAttemptStatus === 'UNKNOWN';
}

/**
 * @param {import('./types.js').AuditProof} [audit]
 */
export function auditGap(audit) {
  const required = audit?.requiredEvents ?? [];
  const present = new Set(audit?.presentEvents ?? []);
  const missing = required.filter((e) => !present.has(e));
  return { missing, complete: missing.length === 0 };
}

/**
 * @param {import('./types.js').IdempotencySafetyProof} [idem]
 */
export function hasIdempotencyRisk(idem) {
  if (!idem) return false;
  return idem.duplicateRisk === true || idem.ambiguousKey === true || idem.idempotencyConflict === true;
}

/**
 * @param {import('./types.js').NoPayNoServiceProofBundle} bundle
 */
export function isSandboxNonMoneyProof(bundle) {
  return bundle.sandbox?.isSandbox === true && bundle.sandbox?.nonMoneyProof === true;
}

/**
 * @param {import('./types.js').OrderDeliveryProof} [order]
 */
export function orderClaimsDelivered(order) {
  if (!order) return false;
  return order.serviceDeliveredFlag === true || order.orderStatus === 'FULFILLED';
}

/**
 * @param {import('./types.js').PaymentProof} [payment]
 */
export function isStalePendingPaid(payment, pending) {
  if (!payment || !pending) return false;
  const paid = hasPaymentProof(payment);
  const status = payment.orderStatus ?? '';
  const staleAge = pending.staleAgeMs ?? 0;
  const threshold = pending.staleThresholdMs ?? 30 * 60 * 1000;
  return paid && status === 'PROCESSING' && staleAge >= threshold;
}
