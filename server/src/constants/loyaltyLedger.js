/** Sources for `LoyaltyLedger.source` / `sourceId` prefix (replay-safe dedupe). */

export const LOYALTY_LEDGER_SOURCE = {
  CHECKOUT_GRANT: 'checkout_grant',
  REFERRAL_BONUS: 'referral_bonus',
};

export const LOYALTY_LEDGER_TYPE = {
  CREDIT: 'CREDIT',
};

/**
 * @param {string} paymentCheckoutId
 */
export function loyaltyLedgerCheckoutSourceId(paymentCheckoutId) {
  return `${LOYALTY_LEDGER_SOURCE.CHECKOUT_GRANT}:${paymentCheckoutId}`;
}

/**
 * @param {string} referralId
 */
export function loyaltyLedgerReferralBonusSourceId(referralId) {
  return `${LOYALTY_LEDGER_SOURCE.REFERRAL_BONUS}:${referralId}`;
}

/**
 * @param {string} paymentCheckoutId
 */
export function loyaltyLedgerCheckoutRowId(paymentCheckoutId) {
  return `ll_chk_${paymentCheckoutId}`;
}

/**
 * @param {string} referralId
 */
export function loyaltyLedgerReferralBonusRowId(referralId) {
  return `ll_rb_${referralId}`;
}
