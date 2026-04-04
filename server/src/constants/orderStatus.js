/** Canonical persisted on `PaymentCheckout.orderStatus`. */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  /** Payment collected + delivery completed (persisted string `FULFILLED`). Prefer `DELIVERED` in new code. */
  FULFILLED: 'FULFILLED',
  /** Alias of `FULFILLED` — product delivery finished (airtime/data). */
  DELIVERED: 'FULFILLED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};
