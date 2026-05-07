/**
 * Unified pre-fulfillment financial lock (trust + fraud + provider truth).
 */

import { env } from '../config/env.js';
import { PROVIDER_TRUTH_STATUS } from '../constants/providerTruthStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../constants/paymentFulfillmentReconciliationStatus.js';
import { isTrustBlocked } from './paymentCheckoutTrust.js';

/**
 * @param {{
 *   trustScore?: number | null,
 *   fraudRiskScore?: number | null,
 *   providerTruthStatus?: string | null,
 *   reconciliationStatus?: string | null,
 * }} order
 * @returns {{ ok: boolean, code: string }}
 */
export function evaluateFinancialSafetyLock(order) {
  if (!env.financialSafetyLockEnabled) {
    return { ok: true, code: 'lock_disabled' };
  }

  const trust = Number(order.trustScore ?? 0);
  if (Number.isFinite(trust) && trust < env.financialSafetyMinTrustScore) {
    return { ok: false, code: 'TRUST_TOO_LOW' };
  }

  const fraud = Number(order.fraudRiskScore ?? 0);
  if (Number.isFinite(fraud) && fraud >= env.fraudRiskFulfillmentBlockThreshold) {
    return { ok: false, code: 'FRAUD_RISK_HIGH' };
  }

  const pt = String(order.providerTruthStatus ?? PROVIDER_TRUTH_STATUS.UNKNOWN);
  if (pt === PROVIDER_TRUTH_STATUS.MISMATCH) {
    return { ok: false, code: 'PROVIDER_TRUTH_MISMATCH' };
  }

  const recon = String(order.reconciliationStatus ?? PAYMENT_FULFILLMENT_RECON_STATUS.OK);
  if (
    pt === PROVIDER_TRUTH_STATUS.UNKNOWN &&
    recon === PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED
  ) {
    return { ok: false, code: 'PROVIDER_TRUTH_UNKNOWN_RECON_REQUIRED' };
  }

  return { ok: true, code: 'ok' };
}

/**
 * Single gate for dispatch + worker claim: fraud threshold (always), optional trust block, optional full safety lock.
 *
 * @param {{
 *   trustScore?: number | null,
 *   fraudRiskScore?: number | null,
 *   providerTruthStatus?: string | null,
 *   reconciliationStatus?: string | null,
 * }} order
 * @returns {{ ok: boolean, code: string }}
 */
export function evaluateFulfillmentMoneyGate(order) {
  const fraud = Number(order.fraudRiskScore ?? 0);
  if (Number.isFinite(fraud) && fraud >= env.fraudRiskFulfillmentBlockThreshold) {
    return { ok: false, code: 'FRAUD_RISK_HIGH' };
  }

  if (
    env.trustScoreFulfillmentBlock === true &&
    typeof order.trustScore === 'number' &&
    isTrustBlocked(order.trustScore)
  ) {
    return { ok: false, code: 'TRUST_SCORE_BLOCKED' };
  }

  return evaluateFinancialSafetyLock(order);
}
