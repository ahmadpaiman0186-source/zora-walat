/**
 * `PaymentCheckout.reconciliationStatus` — payment vs ledger vs fulfillment alignment (ops).
 * Distinct from `RECONCILIATION_STATUS` (financial sign-off DTO in `reconciliationStatus.js`).
 */
export const PAYMENT_FULFILLMENT_RECON_STATUS = Object.freeze({
  OK: 'ok',
  PENDING: 'pending',
  REQUIRED: 'required',
  REPAIRED: 'repaired',
});
