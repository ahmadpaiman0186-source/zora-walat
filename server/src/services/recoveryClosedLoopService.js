/**
 * After repair: re-verify external truth where applicable; escalate persistent mismatch; mark resolved when clear.
 */

import { randomUUID } from 'node:crypto';

import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../constants/paymentFulfillmentReconciliationStatus.js';
import { PROVIDER_TRUTH_STATUS } from '../constants/providerTruthStatus.js';
import { RECOVERY_STATUS } from '../constants/recoveryStatus.js';
import { LEDGER_EVENT_TYPE } from '../ledger/ledgerService.js';
import { runProviderTruthVerificationForOrderId } from './providerVerificationService.js';
import { emitMoneyPathAlert } from './moneyPathAlertService.js';
import {
  bumpRecoveryClosedLoopMetric,
  emitResilienceStructuredLog,
  trackRecoverySample,
} from '../utils/metrics.js';

/**
 * @param {string} id
 * @param {{ traceId?: string | null }} ctx
 */
async function finalizeVerified(id, traceId) {
  await prisma.paymentCheckout.updateMany({
    where: { id, recoveryStatus: RECOVERY_STATUS.REPAIRING },
    data: { recoveryStatus: RECOVERY_STATUS.VERIFIED },
  });
  bumpRecoveryClosedLoopMetric('verified');
  trackRecoverySample(true);
  emitResilienceStructuredLog({
    orderId: id,
    checkoutId: id,
    stage: 'recovery',
    status: 'closed_loop_verified',
    traceId,
  });
}

/**
 * @param {string} id
 * @param {{ traceId?: string | null, reason: string }} ctx
 */
async function finalizeFailed(id, traceId, reason) {
  await prisma.paymentCheckout.updateMany({
    where: { id, recoveryStatus: RECOVERY_STATUS.REPAIRING },
    data: { recoveryStatus: RECOVERY_STATUS.FAILED },
  });
  bumpRecoveryClosedLoopMetric('failed');
  trackRecoverySample(false);
  emitMoneyPathAlert('critical', 'recovery_closed_loop_escalation', {
    orderId: id,
    traceId,
    extra: { reason },
  });
  emitResilienceStructuredLog({
    orderId: id,
    checkoutId: id,
    stage: 'recovery',
    status: 'closed_loop_failed',
    traceId,
    errorCode: reason,
  });
}

/**
 * @param {string} orderId
 * @param {{ traceId?: string | null }} ctx
 */
async function processOneClosedLoop(orderId, ctx) {
  const traceId = ctx.traceId ?? null;
  const row = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    include: {
      fulfillmentAttempts: { select: { status: true, attemptNumber: true } },
      ledgerJournalEntries: {
        where: { eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED },
        take: 1,
      },
    },
  });
  if (!row || row.recoveryStatus !== RECOVERY_STATUS.REPAIRING) return 'skipped';

  if (row.orderStatus === ORDER_STATUS.FULFILLED) {
    await runProviderTruthVerificationForOrderId(orderId, {
      traceId,
      live: true,
    });
    const fresh = await prisma.paymentCheckout.findUnique({
      where: { id: orderId },
      select: { providerTruthStatus: true, reconciliationStatus: true },
    });
    const pt = String(fresh?.providerTruthStatus ?? '');
    if (pt === PROVIDER_TRUTH_STATUS.MISMATCH) {
      await finalizeFailed(orderId, traceId, 'provider_truth_mismatch_after_repair');
      return 'failed';
    }
    if (pt === PROVIDER_TRUTH_STATUS.OK) {
      await finalizeVerified(orderId, traceId);
      return 'verified';
    }
    if (pt === PROVIDER_TRUTH_STATUS.UNKNOWN) {
      bumpRecoveryClosedLoopMetric('unknown_truth');
      emitMoneyPathAlert('warn', 'recovery_closed_loop_provider_unknown', {
        orderId,
        traceId,
      });
      return 'noop';
    }
    return 'noop';
  }

  const recon = String(row.reconciliationStatus ?? '');
  const needsLedger =
    Math.max(0, Math.floor(Number(row.amountUsdCents) || 0)) > 0 &&
    typeof row.completedByWebhookEventId === 'string' &&
    row.completedByWebhookEventId.startsWith('evt_') &&
    String(row.status ?? '') === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED;
  const hasLedger = (row.ledgerJournalEntries?.length ?? 0) > 0;
  const reconClear =
    recon === PAYMENT_FULFILLMENT_RECON_STATUS.OK ||
    recon === PAYMENT_FULFILLMENT_RECON_STATUS.REPAIRED;

  if (reconClear && (!needsLedger || hasLedger)) {
    await finalizeVerified(orderId, traceId);
    return 'verified';
  }

  if (recon === PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED) {
    emitMoneyPathAlert('warn', 'recovery_closed_loop_recon_still_required', {
      orderId,
      traceId,
    });
    bumpRecoveryClosedLoopMetric('recon_pending');
  }

  return 'noop';
}

/**
 * @param {{
 *   traceId?: string | null,
 *   repairedCheckoutIds?: string[],
 *   limit?: number,
 * }} [opts]
 */
export async function runRecoveryClosedLoopTick(opts = {}) {
  const traceId = opts.traceId ?? randomUUID();
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 40);
  const t0 = Date.now();
  /** @type {Set<string>} */
  const ids = new Set(opts.repairedCheckoutIds ?? []);

  const repairing = await prisma.paymentCheckout.findMany({
    where: { recoveryStatus: RECOVERY_STATUS.REPAIRING },
    select: { id: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  for (const r of repairing) ids.add(r.id);

  const list = [...ids].slice(0, limit);
  let verified = 0;
  let failed = 0;
  let noop = 0;
  let skipped = 0;

  for (const id of list) {
    const out = await processOneClosedLoop(id, { traceId });
    if (out === 'verified') verified += 1;
    else if (out === 'failed') failed += 1;
    else if (out === 'noop') noop += 1;
    else skipped += 1;
  }

  return {
    scanned: list.length,
    verified,
    failed,
    noop,
    skipped,
    ms: Date.now() - t0,
    traceId,
  };
}
