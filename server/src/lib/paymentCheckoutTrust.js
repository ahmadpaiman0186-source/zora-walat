import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { PROVIDER_TRUTH_STATUS } from '../constants/providerTruthStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../constants/paymentFulfillmentReconciliationStatus.js';

/**
 * Deterministic trust 0–100 from persisted state (no hidden side effects).
 * +40 server-confirmed payment, +30 delivered, +20 provider truth ok, +10 reconciliation clear.
 *
 * @param {{
 *   status?: string | null,
 *   orderStatus?: string | null,
 *   completedByWebhookEventId?: string | null,
 *   providerTruthStatus?: string | null,
 *   reconciliationStatus?: string | null,
 * }} row
 * @returns {number}
 */
export function computePaymentCheckoutTrustScore(row) {
  let s = 0;
  const paid =
    typeof row.completedByWebhookEventId === 'string' &&
    row.completedByWebhookEventId.trim().startsWith('evt_') &&
    String(row.status ?? '') === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED;
  if (paid) s += 40;

  if (String(row.orderStatus ?? '') === ORDER_STATUS.FULFILLED) {
    s += 30;
  }

  if (String(row.providerTruthStatus ?? '') === PROVIDER_TRUTH_STATUS.OK) {
    s += 20;
  }

  const rs = String(row.reconciliationStatus ?? PAYMENT_FULFILLMENT_RECON_STATUS.OK);
  if (rs !== PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED) {
    s += 10;
  }

  return Math.min(100, Math.max(0, s));
}

/**
 * @param {number} score
 */
export function isTrustSuspicious(score) {
  return score < 70;
}

/**
 * @param {number} score
 */
export function isTrustBlocked(score) {
  return score < 50;
}
