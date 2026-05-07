/** `PaymentCheckout.recoveryStatus` — closed-loop recovery + SLA breach follow-up. */
export const RECOVERY_STATUS = Object.freeze({
  PENDING: 'pending',
  REPAIRING: 'repairing',
  VERIFIED: 'verified',
  FAILED: 'failed',
});
