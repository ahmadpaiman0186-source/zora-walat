/**
 * Customer-safe fulfillment status (no internal diagnostic leakage).
 * Maps persisted checkout + optional latest attempt signals → stable codes for apps/support scripts.
 *
 * Internal reasons (`failureReason`, Stripe ids) stay on canonical DTO; do not surface raw strings to end users.
 */
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { parseManualReviewFlags } from '../services/canonicalPhase1Lifecycle.js';

/** Stable externally facing codes (snake_case). */
export const CUSTOMER_FULFILLMENT_VIEW = {
  AWAITING_PAYMENT: 'awaiting_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  FULFILLING: 'fulfilling',
  FULFILLED: 'fulfilled',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  NEEDS_REVIEW: 'needs_review',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
};

/**
 * @param {import('@prisma/client').PaymentCheckout} checkout
 * @param {import('@prisma/client').FulfillmentAttempt | null | undefined} latestAttempt
 */
export function deriveCustomerFulfillmentView(checkout, latestAttempt) {
  const manual = parseManualReviewFlags(checkout.metadata);
  const os = checkout.orderStatus;
  const pay = checkout.status;

  const paymentCaptured =
    pay === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
    pay === PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING ||
    pay === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED ||
    pay === PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED;

  if (os === ORDER_STATUS.CANCELLED) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.CANCELLED,
      customerPaid: paymentCaptured,
      headline: 'cancelled',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }
  if (os === ORDER_STATUS.FAILED) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.FAILED,
      customerPaid: paymentCaptured,
      headline: 'failed',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }
  if (os === ORDER_STATUS.FULFILLED || os === ORDER_STATUS.DELIVERED) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.FULFILLED,
      customerPaid: true,
      headline: 'fulfilled',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }

  if (manual.manualReviewRequired) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.NEEDS_REVIEW,
      customerPaid: paymentCaptured,
      headline: 'needs_review',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }

  if (suggestsProviderUnavailable(checkout, latestAttempt)) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.PROVIDER_UNAVAILABLE,
      customerPaid: paymentCaptured,
      headline: 'provider_unavailable',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }

  if (!paymentCaptured) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.AWAITING_PAYMENT,
      customerPaid: false,
      headline: 'awaiting_payment',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }

  if (os === ORDER_STATUS.PAID) {
    return {
      code: CUSTOMER_FULFILLMENT_VIEW.PAID,
      customerPaid: true,
      headline: 'paid',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }

  if (os === ORDER_STATUS.PROCESSING) {
    const la = latestAttempt?.status;
    const fulfilling =
      la === FULFILLMENT_ATTEMPT_STATUS.PROCESSING ||
      la === FULFILLMENT_ATTEMPT_STATUS.QUEUED;
    return {
      code: fulfilling
        ? CUSTOMER_FULFILLMENT_VIEW.FULFILLING
        : CUSTOMER_FULFILLMENT_VIEW.PROCESSING,
      customerPaid: true,
      headline: fulfilling ? 'fulfilling' : 'processing',
      internalOrderStatus: os,
      internalPaymentStatus: pay,
    };
  }

  return {
    code: CUSTOMER_FULFILLMENT_VIEW.PROCESSING,
    customerPaid: paymentCaptured,
    headline: 'processing',
    internalOrderStatus: os,
    internalPaymentStatus: pay,
  };
}

function suggestsProviderUnavailable(checkout, latestAttempt) {
  const fr = String(checkout.failureReason ?? '').toLowerCase();
  if (fr.includes('unavailable') || fr === AIRTIME_UNAVAILABLE_TOKEN) return true;
  const ar = String(latestAttempt?.failureReason ?? '').toLowerCase();
  return ar.includes('unavailable');
}

const AIRTIME_UNAVAILABLE_TOKEN = 'provider_unavailable';
