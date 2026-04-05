/** Issue codes returned by `reconciliationService` (detection only). */

export const RECONCILIATION_ISSUE = {
  ORDER_PAID_STUCK: 'order_paid_stuck',
  ORDER_PROCESSING_STUCK: 'order_processing_stuck',
  FULFILLMENT_QUEUED_STUCK: 'fulfillment_queued_stuck',
  FULFILLMENT_PROCESSING_STUCK: 'fulfillment_processing_stuck',
  PAYMENT_STATUS_MISMATCH: 'payment_status_mismatch',
  FULFILLMENT_ORDER_MISMATCH: 'fulfillment_order_mismatch',
  PAID_WITHOUT_ATTEMPT: 'paid_without_fulfillment_attempt',
  /** Referral marked rewarded / paid but qualifying order is not terminal-delivered. */
  REFERRAL_REWARD_ORDER_MISMATCH: 'referral_reward_order_mismatch',
  /** Referral REWARDED without a reward transaction row. */
  REFERRAL_STATE_INCONSISTENT: 'referral_state_inconsistent',
  /** Fulfilled checkout should have earned points (by policy) but no LoyaltyPointsGrant row. */
  LOYALTY_GRANT_MISSING_FOR_FULFILLED: 'loyalty_grant_missing_for_fulfilled',
  /** User.loyaltyPointsTotal does not match sum(LoyaltyPointsGrant.points). */
  LOYALTY_POINTS_TOTAL_DRIFT: 'loyalty_points_total_drift',
  /** Grant row exists without matching LoyaltyLedger credit (replay gap). */
  LOYALTY_GRANT_WITHOUT_LEDGER: 'loyalty_grant_without_ledger',
  /** User.loyaltyPointsTotal does not match sum(LoyaltyLedger.amount). */
  LOYALTY_LEDGER_TOTAL_DRIFT: 'loyalty_ledger_total_drift',
  /** Delivered inbox notification missing after quiet window (ops signal only). */
  PUSH_DELIVERED_NOTIFICATION_GAP: 'push_delivered_notification_gap',
};
