/**
 * Phase 1 payment reconciliation + refund **safety** (policy + operator checklist).
 * Does not call Stripe; does not issue refunds. Mirrors support posture in `canonicalPhase1Lifecycle.js`.
 */
import { PAYMENT_CHECKOUT_STATUS } from '../../constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../../constants/postPaymentIncidentStatus.js';

/** Phase 1 never performs automatic Stripe refunds from recon or fulfillment failure handlers. */
export const PHASE1_AUTOMATIC_STRIPE_REFUND_FORBIDDEN = true;

/**
 * `charge.refunded` webhooks update `postPaymentIncidentStatus` only (see `applyPhase1ChargeRefunded`).
 */
export const PHASE1_STRIPE_REFUND_IS_WEBHOOK_MIRROR_ONLY = true;

/**
 * @param {{
 *   status?: string | null,
 *   postPaymentIncidentStatus?: string | null,
 * }} checkout — `PaymentCheckout` subset
 * @returns {{
 *   mayRequestManualStripeRefundReview: boolean,
 *   denials: string[],
 *   automaticRefundWouldRun: false,
 * }}
 */
export function assessPhase1RefundOperatorChecklist(checkout) {
  /** @type {string[]} */
  const denials = [];
  const s = checkout.status != null ? String(checkout.status) : '';

  /** Stripe money mirrored as succeeded on the row — required before any refund *review*. */
  const settlementConfirmedOnRow =
    s === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
    s === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED;

  if (!settlementConfirmedOnRow) {
    denials.push('stripe_settlement_not_confirmed_on_payment_row');
  }

  const inc = checkout.postPaymentIncidentStatus != null
    ? String(checkout.postPaymentIncidentStatus)
    : POST_PAYMENT_INCIDENT_STATUS.NONE;
  if (inc === POST_PAYMENT_INCIDENT_STATUS.REFUNDED) {
    denials.push('already_recorded_refunded_incident');
  }

  return {
    mayRequestManualStripeRefundReview: denials.length === 0,
    denials,
    automaticRefundWouldRun: false,
  };
}

/**
 * After paid + failed fulfillment attempt, recon recommends `MANUAL_REVIEW` — never auto-refund.
 * @param {{ recommendation?: string }} reconFinding — row from `runPhase1MoneyFulfillmentReconciliationScan`
 */
export function failedFulfillmentImpliesManualReviewNotAutoRefund(reconFinding) {
  const r = reconFinding?.recommendation;
  return (
    r === 'MANUAL_REVIEW' ||
    r === 'VERIFY_PROVIDER_EVIDENCE' ||
    r === 'VERIFY_STRIPE_PAYMENT'
  );
}
