import { webTopupLog } from '../../lib/webTopupObservability.js';
import { enqueueWebTopupFulfillmentJob } from '../topupFulfillment/webtopFulfillmentJob.js';

/**
 * Enqueue DB-backed async fulfillment recovery (same idempotency plane as existing worker drain).
 * Safe to call only when order is in a state the worker can process (typically QUEUED / retry path).
 *
 * @param {object} p
 * @param {string} p.orderId
 * @param {number} p.attemptNo — 1-based; must align with `WebTopupFulfillmentJob.dedupeKey` scheme
 * @param {string} p.reason — machine-readable reason (e.g. transient_exhausted)
 * @param {string | null | undefined} p.traceId
 * @param {import('pino').Logger | undefined} p.log
 * @param {typeof enqueueWebTopupFulfillmentJob} [p.enqueueFn]
 */
export async function enqueueReliabilityRecoveryJob(p) {
  const enqueueFn = p.enqueueFn ?? enqueueWebTopupFulfillmentJob;
  const job = await enqueueFn(p.orderId, p.attemptNo, {});
  webTopupLog(p.log, 'info', 'reliability_recovery_enqueued', {
    kind: 'reliability_recovery',
    orderIdSuffix: p.orderId.slice(-8),
    reason: p.reason,
    traceId: p.traceId ?? null,
    dedupeKey: job?.dedupeKey ?? null,
  });
  return { ok: true, job };
}
