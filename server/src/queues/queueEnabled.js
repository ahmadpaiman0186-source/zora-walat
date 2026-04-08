/**
 * Single source of truth for "is the Phase 1 fulfillment BullMQ path active".
 * Must match operational intent: explicit flag + durable Redis URL.
 */
export function isFulfillmentQueueEnabled() {
  return (
    process.env.FULFILLMENT_QUEUE_ENABLED === 'true' &&
    !!String(process.env.REDIS_URL ?? '').trim()
  );
}
