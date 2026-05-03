/**
 * Maps existing persisted web top-up rows to a canonical lifecycle phase for
 * observability, reporting, and future unified transaction engine migration.
 * Does NOT mutate data — pure projection only.
 */
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';
import {
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP,
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP_LEGACY,
} from '../constants/walletLedgerReasons.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from './topupOrder/statuses.js';

/** @typedef {typeof CANONICAL_PHASE[keyof typeof CANONICAL_PHASE]} CanonicalPhase */

export const CANONICAL_PHASE = Object.freeze({
  PENDING: 'PENDING',
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});

/**
 * @param {{
 *   paymentStatus?: string | null;
 *   fulfillmentStatus?: string | null;
 *   paymentIntentId?: string | null;
 * } | null | undefined} row
 * @returns {CanonicalPhase | null}
 */
export function deriveCanonicalPhaseFromWebTopupOrder(row) {
  if (!row || typeof row !== 'object') return null;

  const ps = row.paymentStatus;
  const fs = row.fulfillmentStatus;
  const hasPi =
    typeof row.paymentIntentId === 'string' && row.paymentIntentId.trim().length > 0;

  if (ps === PAYMENT_STATUS.REFUNDED) return CANONICAL_PHASE.REFUNDED;
  if (ps === PAYMENT_STATUS.FAILED) return CANONICAL_PHASE.FAILED;

  if (ps === PAYMENT_STATUS.PENDING && hasPi) {
    return CANONICAL_PHASE.PAYMENT_INITIATED;
  }
  if (ps === PAYMENT_STATUS.PENDING) {
    return CANONICAL_PHASE.PENDING;
  }

  if (ps !== PAYMENT_STATUS.PAID) {
    return CANONICAL_PHASE.PENDING;
  }

  if (fs === FULFILLMENT_STATUS.DELIVERED) return CANONICAL_PHASE.SUCCESS;
  if (fs === FULFILLMENT_STATUS.FAILED) return CANONICAL_PHASE.FAILED;
  if (
    fs === FULFILLMENT_STATUS.PROCESSING ||
    fs === FULFILLMENT_STATUS.QUEUED ||
    fs === FULFILLMENT_STATUS.RETRYING
  ) {
    return CANONICAL_PHASE.PROCESSING;
  }

  return CANONICAL_PHASE.PAYMENT_CONFIRMED;
}

/**
 * Phase 1 marketing checkout (`PaymentCheckout`) → canonical phase (mirror-only).
 * @param {null | {
 *   orderStatus?: string | null;
 *   status?: string | null;
 *   stripePaymentIntentId?: string | null;
 *   postPaymentIncidentStatus?: string | null;
 * } | undefined} row
 * @returns {CanonicalPhase | null}
 */
export function deriveCanonicalPhaseFromPaymentCheckout(row) {
  if (!row || typeof row !== 'object') return null;

  const incident = row.postPaymentIncidentStatus;
  if (incident === POST_PAYMENT_INCIDENT_STATUS.REFUNDED) {
    return CANONICAL_PHASE.REFUNDED;
  }

  const os = row.orderStatus;
  if (os === ORDER_STATUS.FAILED || os === ORDER_STATUS.CANCELLED) {
    return CANONICAL_PHASE.FAILED;
  }
  if (os === ORDER_STATUS.FULFILLED) return CANONICAL_PHASE.SUCCESS;
  if (os === ORDER_STATUS.PROCESSING) return CANONICAL_PHASE.PROCESSING;

  if (os === ORDER_STATUS.PAID) return CANONICAL_PHASE.PAYMENT_CONFIRMED;

  const st = row.status;
  if (st === PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED) {
    return CANONICAL_PHASE.FAILED;
  }

  const hasPi =
    typeof row.stripePaymentIntentId === 'string' &&
    row.stripePaymentIntentId.startsWith('pi_');
  if (hasPi && os === ORDER_STATUS.PENDING) {
    return CANONICAL_PHASE.PAYMENT_INITIATED;
  }

  if (
    st === PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED ||
    st === PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING
  ) {
    return CANONICAL_PHASE.PAYMENT_INITIATED;
  }

  return CANONICAL_PHASE.PENDING;
}

/**
 * User wallet ledger credit (supported top-up reasons) → SUCCESS when credited.
 * @param {null | {
 *   direction?: string | null;
 *   reason?: string | null;
 * } | undefined} entry
 * @returns {CanonicalPhase | null}
 */
export function deriveCanonicalPhaseFromWalletLedgerEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (String(entry.direction) !== 'CREDIT') return null;
  const r = String(entry.reason ?? '');
  if (
    r === USER_WALLET_LEDGER_REASON_WALLET_TOPUP ||
    r === USER_WALLET_LEDGER_REASON_WALLET_TOPUP_LEGACY
  ) {
    return CANONICAL_PHASE.SUCCESS;
  }
  return CANONICAL_PHASE.SUCCESS;
}
