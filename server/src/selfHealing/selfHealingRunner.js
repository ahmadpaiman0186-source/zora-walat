/**
 * L8 money-path self-healing runner — bounded scans + optional safe repairs.
 */

import { randomUUID } from 'node:crypto';

import { prisma as defaultPrisma } from '../db.js';
import { env } from '../config/env.js';
import { scanMoneyPathDrifts } from './moneyPathDriftScan.js';
import { applySafeMoneyPathRepair } from './moneyPathDriftRepair.js';
import { emitSelfHealingSpan } from './l8SelfHealingObservability.js';

/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
/** @typedef {import('./moneyPathDriftScan.js').MoneyPathDriftInconsistency} MoneyPathDriftInconsistency */

/**
 * @param {{
 *   prisma?: PrismaClient,
 *   traceId?: string | null,
 *   scanLimit?: number,
 *   applyRepairs?: boolean,
 *   deps?: {
 *     getStripeClientFn?: typeof import('../services/stripe.js').getStripeClient,
 *     postPaymentCapturedLedgerFn?: typeof import('../ledger/ledgerService.js').postPaymentCapturedLedger,
 *     enqueueFn?: typeof import('../queues/phase1FulfillmentProducer.js').enqueuePhase1FulfillmentJob,
 *   },
 * }} [opts]
 */
export async function runSelfHealingMoneyPath(opts = {}) {
  const client = opts.prisma ?? defaultPrisma;
  const traceId =
    opts.traceId ?? `l8-self-heal:${Date.now()}:${randomUUID().slice(0, 8)}`;
  const scanLimit = opts.scanLimit ?? env.selfHealingScanLimit;
  const applyRepairs = opts.applyRepairs === true;

  const inconsistencies = await scanMoneyPathDrifts({
    prisma: client,
    limit: scanLimit,
  });

  for (const inc of inconsistencies) {
    emitSelfHealingSpan('self_healing_detected', {
      traceId: inc.traceId ?? traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'scan',
      result: 'detected',
    });
  }

  /** @type {{ inconsistency: MoneyPathDriftInconsistency, repair: { action: string, result: string } }[]} */
  const repairs = [];

  if (applyRepairs) {
    for (const inc of inconsistencies) {
      const effectiveTrace = inc.traceId ?? traceId;
      const repair = await applySafeMoneyPathRepair({
        prisma: client,
        inconsistency: inc,
        traceId: effectiveTrace,
        deps: opts.deps,
      });
      repairs.push({ inconsistency: inc, repair });
    }
  }

  const detections = inconsistencies.map((i) => ({
    type: i.type,
    subtype: i.subtype,
    checkoutIdSuffix:
      i.checkoutId.length <= 12 ? i.checkoutId : i.checkoutId.slice(-12),
    traceId: i.traceId ?? traceId,
  }));

  return {
    traceId,
    applyRepairs,
    summary: {
      detected: inconsistencies.length,
      repairsAttempted: repairs.length,
    },
    detections,
    repairs,
  };
}

/**
 * Worker tick entry — respects {@link env.selfHealingApplyRepairs}.
 */
export async function runSelfHealingMoneyPathTick() {
  return runSelfHealingMoneyPath({
    scanLimit: env.selfHealingScanLimit,
    applyRepairs: env.selfHealingApplyRepairs === true,
  });
}
