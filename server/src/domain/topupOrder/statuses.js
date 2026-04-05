/** @typedef {'pending' | 'paid' | 'failed' | 'refunded'} PaymentStatus */
/**
 * WebTopupOrder fulfillment lifecycle (provider dispatch — distinct from payment).
 * @typedef {'pending' | 'queued' | 'processing' | 'delivered' | 'failed' | 'retrying'} FulfillmentStatus
 */

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const FULFILLMENT_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  /** Awaiting operator retry after a retryable provider failure (optional explicit state). */
  RETRYING: 'retrying',
};
