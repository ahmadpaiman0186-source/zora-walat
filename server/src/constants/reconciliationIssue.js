/** Issue codes returned by `reconciliationService` (detection only). */

export const RECONCILIATION_ISSUE = {
  ORDER_PAID_STUCK: 'order_paid_stuck',
  ORDER_PROCESSING_STUCK: 'order_processing_stuck',
  FULFILLMENT_QUEUED_STUCK: 'fulfillment_queued_stuck',
  FULFILLMENT_PROCESSING_STUCK: 'fulfillment_processing_stuck',
  PAYMENT_STATUS_MISMATCH: 'payment_status_mismatch',
  FULFILLMENT_ORDER_MISMATCH: 'fulfillment_order_mismatch',
  PAID_WITHOUT_ATTEMPT: 'paid_without_fulfillment_attempt',
};
