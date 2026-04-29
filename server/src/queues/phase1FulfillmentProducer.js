import { parsePhase1FulfillmentJobPayload } from '../infrastructure/fulfillment/fulfillmentJobContract.js';
import { getPhase1FulfillmentQueue } from './phase1FulfillmentQueue.js';
import { PHASE1_FULFILLMENT_QUEUE_NAME } from './phase1FulfillmentQueueName.js';

const DEDUPE_ACTIVE_STATES = new Set([
  'waiting',
  'delayed',
  'paused',
  'active',
  'prioritized',
]);

/**
 * @param {string} orderId PaymentCheckout.id
 * @param {string | null | undefined} traceId
 * @returns {Promise<{ ok: true, jobId: string } | { ok: false, reason: string }>}
 */
export async function enqueuePhase1FulfillmentJob(orderId, traceId) {
  const q = getPhase1FulfillmentQueue();
  if (!q) {
    return { ok: false, reason: 'queue_unavailable' };
  }
  const id = String(orderId ?? '').trim();
  if (!id) {
    return { ok: false, reason: 'missing_order_id' };
  }
  try {
    const existing = await q.getJob(id);
    if (existing) {
      const state = await existing.getState();
      if (DEDUPE_ACTIVE_STATES.has(state)) {
        return { ok: true, jobId: id, deduped: true };
      }
    }
    const rawPayload = {
      orderId: id,
      idempotencyKey: id,
      traceId: traceId ?? null,
      v: 1,
    };
    const parsed = parsePhase1FulfillmentJobPayload(rawPayload);
    if (!parsed.ok) {
      return { ok: false, reason: `invalid_job_contract:${parsed.reason}` };
    }
    await q.add('process', parsed.payload, {
      jobId: id,
    });
    return { ok: true, jobId: id };
  } catch (e) {
    const msg = String(e?.message ?? e).toLowerCase();
    if (msg.includes('duplicate') || String(e?.name ?? '') === 'DuplicateJobError') {
      return { ok: true, jobId: id, deduped: true };
    }
    return {
      ok: false,
      reason: `enqueue_failed:${String(e?.message ?? e).slice(0, 200)}`,
    };
  }
}

export { PHASE1_FULFILLMENT_QUEUE_NAME };
