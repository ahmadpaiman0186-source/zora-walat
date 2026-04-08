/** Default parallel jobs per Phase 1 fulfillment worker process (development-safe). */
export const PHASE1_FULFILLMENT_WORKER_CONCURRENCY_DEFAULT = 5;

/**
 * BullMQ worker concurrency for `phase1-fulfillment-v1`.
 * `PHASE1_FULFILLMENT_WORKER_CONCURRENCY` wins; invalid/missing → default (5); always integer ≥ 1.
 * @returns {number}
 */
export function resolvePhase1FulfillmentWorkerConcurrency() {
  const raw = String(
    process.env.PHASE1_FULFILLMENT_WORKER_CONCURRENCY ?? '',
  ).trim();
  if (!raw) {
    return PHASE1_FULFILLMENT_WORKER_CONCURRENCY_DEFAULT;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return PHASE1_FULFILLMENT_WORKER_CONCURRENCY_DEFAULT;
  }
  return n;
}
