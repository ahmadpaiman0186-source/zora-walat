import { getPhase1FulfillmentQueue } from './phase1FulfillmentQueue.js';

/**
 * Wait until no waiting/active/delayed jobs remain (worker must be running elsewhere).
 */
export async function waitForPhase1FulfillmentQueueDrained({
  timeoutMs = 300_000,
  pollMs = 200,
} = {}) {
  const q = getPhase1FulfillmentQueue();
  if (!q) {
    return { ok: false, reason: 'queue_unavailable' };
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const c = await q.getJobCounts('waiting', 'active', 'delayed');
    if (c.waiting + c.active + c.delayed === 0) {
      return { ok: true };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  const c = await q.getJobCounts('waiting', 'active', 'delayed');
  return {
    ok: false,
    reason: 'drain_timeout',
    waiting: c.waiting,
    active: c.active,
    delayed: c.delayed,
  };
}
