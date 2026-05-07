/**
 * Composes safe, idempotent recovery passes (Stripe signature path unchanged).
 * Order: processing recovery → payment/fulfillment recon tick → SLA guard → reconciliation repair
 * → recovery closed-loop → provider truth verification → safe queue retry scan.
 */

import { randomUUID } from 'node:crypto';

import { runProcessingRecoveryTick } from './processingRecoveryService.js';
import { runPaymentFulfillmentReconciliationTick } from './reconciliationService.js';
import { runReconciliationRepairTick } from './reconciliationRepairService.js';
import { runRecoveryClosedLoopTick } from './recoveryClosedLoopService.js';
import { runSlaGuardTick } from './slaGuardService.js';
import { runProviderTruthVerificationTick } from './providerVerificationService.js';
import { executePhase1RecoveryScanOnce } from './recoveryPhase1SafeQueueRetryService.js';
import { emitResilienceStructuredLog } from '../utils/metrics.js';

/**
 * @param {{
 *   traceId?: string | null,
 *   reconLimit?: number,
 *   repairLimit?: number,
 *   verifyLimit?: number,
 *   safeQueueLimit?: number,
 *   slaLimit?: number,
 *   closedLoopLimit?: number,
 * }} [opts]
 */
export async function runRecoveryOrchestratorTick(opts = {}) {
  const traceId = opts.traceId ?? randomUUID();
  const t0 = Date.now();

  /** @type {Record<string, unknown>} */
  const errors = {};

  let processing = { skipped: true };
  try {
    processing = await runProcessingRecoveryTick();
  } catch (e) {
    errors.processingRecovery = String(e?.message ?? e).slice(0, 240);
  }

  let recon = { scanned: 0, updated: 0, enqueued: 0, ms: 0 };
  try {
    recon = await runPaymentFulfillmentReconciliationTick({
      limit: opts.reconLimit ?? 30,
      traceId,
    });
  } catch (e) {
    errors.paymentFulfillmentRecon = String(e?.message ?? e).slice(0, 240);
  }

  let sla = { scanned: 0, firstBreaches: 0, requeued: 0, ms: 0 };
  try {
    sla = await runSlaGuardTick({ traceId, limit: opts.slaLimit ?? 15 });
  } catch (e) {
    errors.slaGuard = String(e?.message ?? e).slice(0, 240);
  }

  let repair = { ok: true, stats: {}, repairedCheckoutIds: [] };
  try {
    repair = await runReconciliationRepairTick({
      limit: opts.repairLimit ?? 12,
      traceId,
    });
  } catch (e) {
    errors.reconciliationRepair = String(e?.message ?? e).slice(0, 240);
  }

  let closedLoop = {
    scanned: 0,
    verified: 0,
    failed: 0,
    noop: 0,
    skipped: 0,
    ms: 0,
  };
  try {
    closedLoop = await runRecoveryClosedLoopTick({
      traceId,
      repairedCheckoutIds: repair.repairedCheckoutIds ?? [],
      limit: opts.closedLoopLimit ?? 10,
    });
  } catch (e) {
    errors.recoveryClosedLoop = String(e?.message ?? e).slice(0, 240);
  }

  let verify = { scanned: 0, mismatches: 0, flagged: 0, smartLive: 0, ms: 0 };
  try {
    verify = await runProviderTruthVerificationTick({
      limit: opts.verifyLimit ?? 8,
      traceId,
    });
  } catch (e) {
    errors.providerVerification = String(e?.message ?? e).slice(0, 240);
  }

  let safeQueue = {
    ok: true,
    scannedFindings: 0,
    safeRetryCandidates: 0,
    uniqueRequeued: 0,
    results: [],
  };
  try {
    safeQueue = await executePhase1RecoveryScanOnce({
      limit: opts.safeQueueLimit ?? 15,
      traceId,
    });
  } catch (e) {
    errors.safeQueueRetry = String(e?.message ?? e).slice(0, 240);
  }

  emitResilienceStructuredLog({
    stage: 'recovery',
    status: 'tick_complete',
    latencyMs: Date.now() - t0,
    traceId,
    extra: {
      processingRecovery: processing,
      paymentFulfillmentRecon: recon,
      slaGuard: sla,
      reconciliationRepair: repair,
      recoveryClosedLoop: closedLoop,
      providerVerification: verify,
      safeQueueRetry: {
        scannedFindings: safeQueue.scannedFindings,
        uniqueRequeued: safeQueue.uniqueRequeued,
      },
      orchestratorErrors: Object.keys(errors).length ? errors : undefined,
    },
  });

  return {
    traceId,
    ms: Date.now() - t0,
    processingRecovery: processing,
    paymentFulfillmentRecon: recon,
    slaGuard: sla,
    reconciliationRepair: repair,
    recoveryClosedLoop: closedLoop,
    providerVerification: verify,
    safeQueueRetry: safeQueue,
    errors: Object.keys(errors).length ? errors : null,
  };
}
