/**
 * One-shot recovery: re-dispatch fulfillment for Phase 1 recon findings that are explicitly
 * `SAFE_QUEUE_RETRY_CANDIDATE` / `SAFE_RETRY` only. No refunds, no Stripe mutations.
 */

import { randomUUID } from 'node:crypto';

import {
  runPhase1MoneyFulfillmentReconciliationScan,
  RECON_RECOMMENDATION,
  RECON_V2_ACTION,
} from './phase1MoneyFulfillmentReconciliationEngine.js';
import { runFulfillmentDispatchForOrder } from './fulfillmentProcessingService.js';
import {
  emitPhase1MissionStructuredLog,
} from '../infrastructure/observability/phase1MissionObservability.js';

/**
 * @param {{ limit?: number, paidIdleMs?: number, traceId?: string | null }} [opts]
 */
export async function executePhase1RecoveryScanOnce(opts = {}) {
  const parentTrace = opts.traceId ?? null;
  const report = await runPhase1MoneyFulfillmentReconciliationScan({
    limit: opts.limit,
    paidIdleMs: opts.paidIdleMs,
    traceId: parentTrace,
  });
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const safe = findings.filter(
    (f) =>
      f?.recommendation === RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE &&
      f?.actionV2 === RECON_V2_ACTION.SAFE_RETRY &&
      typeof f?.checkoutId === 'string' &&
      f.checkoutId.trim(),
  );
  const seen = new Set();
  /** @type {{ checkoutId: string, traceId: string, outcome: string }[]} */
  const results = [];
  for (const f of safe) {
    const checkoutId = String(f.checkoutId).trim();
    if (seen.has(checkoutId)) continue;
    seen.add(checkoutId);
    const traceId = `recovery:${parentTrace ?? randomUUID()}:${checkoutId.slice(-8)}`;
    emitPhase1MissionStructuredLog({
      subsystem: 'recovery',
      stage: 'safe_queue_retry_dispatch',
      outcome: 'ok',
      traceId,
      orderId: checkoutId,
      checkoutId,
      eventIdSuffix: null,
      latencyMs: null,
      extra: { divergenceCode: f.divergenceCode ?? null },
    });
    try {
      await runFulfillmentDispatchForOrder(checkoutId, traceId);
      results.push({ checkoutId, traceId, outcome: 'dispatched' });
    } catch (e) {
      results.push({
        checkoutId,
        traceId,
        outcome: 'error',
        message: String(e?.message ?? e).slice(0, 200),
      });
    }
  }
  return {
    ok: true,
    scannedFindings: findings.length,
    safeRetryCandidates: safe.length,
    uniqueRequeued: results.length,
    results,
  };
}
