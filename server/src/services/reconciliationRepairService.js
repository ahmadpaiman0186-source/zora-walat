/**
 * Bounded, idempotent reconciliation **repairs** (Stripe verification untouched; ledger posts are idempotent keys only).
 */

import { randomUUID } from 'node:crypto';

import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { LEDGER_EVENT_TYPE, postPaymentCapturedLedger } from '../ledger/ledgerService.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../constants/paymentFulfillmentReconciliationStatus.js';
import { PROVIDER_TRUTH_STATUS } from '../constants/providerTruthStatus.js';
import { ensureQueuedFulfillmentAttempt } from './fulfillmentProcessingService.js';
import { scheduleFulfillmentProcessing } from './fulfillmentProcessingService.js';
import { computePaymentCheckoutTrustScore } from '../lib/paymentCheckoutTrust.js';
import { mergeManualRequiredMetadata } from '../lib/manualRequiredMetadata.js';
import { emitMoneyPathAlert } from './moneyPathAlertService.js';
import { runProviderTruthVerificationForOrderId } from './providerVerificationService.js';
import { RECOVERY_STATUS } from '../constants/recoveryStatus.js';

/**
 * @param {import('@prisma/client').PaymentCheckout} row
 */
async function persistTrustScoreTx(tx, row) {
  const ts = computePaymentCheckoutTrustScore({
    status: row.status,
    orderStatus: row.orderStatus,
    completedByWebhookEventId: row.completedByWebhookEventId,
    providerTruthStatus: row.providerTruthStatus,
    reconciliationStatus: row.reconciliationStatus,
  });
  await tx.paymentCheckout.updateMany({
    where: { id: row.id },
    data: { trustScore: ts },
  });
}

/**
 * @param {{ limit?: number, traceId?: string | null }} [opts]
 */
export async function runReconciliationRepairTick(opts = {}) {
  const traceId = opts.traceId ?? randomUUID();
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 80);
  const t0 = Date.now();
  /** @type {Set<string>} */
  const repairedCheckoutIds = new Set();
  /** @type {Record<string, number>} */
  const stats = {
    ledgerRepaired: 0,
    fulfillmentEnqueued: 0,
    providerVerifyTriggered: 0,
    criticalSuspended: 0,
    duplicateLedgerAlerts: 0,
  };

  const dupRows = await prisma.$queryRaw`
    SELECT "paymentCheckoutId" AS "pid", COUNT(*)::int AS c
    FROM "LedgerJournalEntry"
    WHERE "eventType" = 'PAYMENT_CAPTURED'
      AND "paymentCheckoutId" IS NOT NULL
    GROUP BY "paymentCheckoutId"
    HAVING COUNT(*) > 1
    LIMIT 15
  `;
  for (const d of /** @type {{ pid: string, c: number }[]} */ (dupRows ?? [])) {
    stats.duplicateLedgerAlerts += 1;
    emitMoneyPathAlert('critical', 'duplicate_payment_captured_ledger', {
      orderId: d.pid,
      traceId,
      extra: { count: d.c },
    });
  }

  const missingLedgerRows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      amountUsdCents: { gt: 0 },
      completedByWebhookEventId: { not: null },
      ledgerJournalEntries: {
        none: { eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED },
      },
    },
    take: Math.min(5, limit),
    orderBy: { createdAt: 'asc' },
  });
  for (const c of missingLedgerRows) {
    emitMoneyPathAlert('critical', 'missing_ledger_repair_candidate', {
      orderId: c.id,
      traceId,
    });
    let repairedOk = false;
    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.paymentCheckout.findUnique({ where: { id: c.id } });
        if (!fresh) return;
        const again = await tx.ledgerJournalEntry.findFirst({
          where: {
            paymentCheckoutId: c.id,
            eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED,
          },
        });
        if (again) return;
        if (
          !fresh.completedByWebhookEventId ||
          !String(fresh.completedByWebhookEventId).startsWith('evt_')
        ) {
          return;
        }
        await postPaymentCapturedLedger(tx, {
          checkoutId: c.id,
          stripeEventId: String(fresh.completedByWebhookEventId),
          amountUsdCents: fresh.amountUsdCents,
        });
        await persistTrustScoreTx(tx, fresh);
        repairedOk = true;
      });
      if (repairedOk) {
        stats.ledgerRepaired += 1;
        repairedCheckoutIds.add(c.id);
        await prisma.paymentCheckout.updateMany({
          where: { id: c.id },
          data: { recoveryStatus: RECOVERY_STATUS.REPAIRING },
        });
      }
    } catch (e) {
      emitMoneyPathAlert('warn', 'ledger_repair_failed', {
        orderId: c.id,
        traceId,
        extra: { message: String(e?.message ?? e).slice(0, 200) },
      });
    }
  }

  const candidates = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: {
        in: [
          ORDER_STATUS.PAID,
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.FULFILLED,
        ],
      },
      reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
    },
    take: limit,
    orderBy: { updatedAt: 'asc' },
    include: {
      fulfillmentAttempts: { where: { attemptNumber: 1 } },
      ledgerJournalEntries: {
        where: { eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED },
        take: 2,
      },
    },
  });

  for (const c of candidates) {
    const att1 = c.fulfillmentAttempts?.[0] ?? null;
    const hasLedger = (c.ledgerJournalEntries?.length ?? 0) > 0;
    const needsLedger =
      Math.max(0, Math.floor(Number(c.amountUsdCents) || 0)) > 0 &&
      typeof c.completedByWebhookEventId === 'string' &&
      c.completedByWebhookEventId.trim().startsWith('evt_') &&
      String(c.status ?? '') === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED;

    /** CASE 4: delivered + provider mismatch — stop auto-retry */
    if (
      c.orderStatus === ORDER_STATUS.FULFILLED &&
      c.providerTruthStatus === PROVIDER_TRUTH_STATUS.MISMATCH
    ) {
      await prisma.$transaction(async (tx) => {
        const cur = await tx.paymentCheckout.findUnique({
          where: { id: c.id },
          select: { metadata: true },
        });
        const base = mergeManualRequiredMetadata(cur?.metadata, {
          reason: 'provider_truth_mismatch',
          traceId,
          classification: 'reconciliation_repair_suspended',
        });
        base.reconciliationRepair = {
          ...(typeof base.reconciliationRepair === 'object' &&
          base.reconciliationRepair &&
          !Array.isArray(base.reconciliationRepair)
            ? base.reconciliationRepair
            : {}),
          autoRetrySuspended: true,
          suspendedAt: new Date().toISOString(),
        };
        await tx.paymentCheckout.updateMany({
          where: { id: c.id },
          data: { metadata: base, recoveryStatus: RECOVERY_STATUS.FAILED },
        });
      });
      stats.criticalSuspended += 1;
      emitMoneyPathAlert('critical', 'fulfilled_provider_mismatch_no_auto_retry', {
        orderId: c.id,
        traceId,
      });
      continue;
    }

    /** CASE 1: payment + no ledger */
    if (needsLedger && !hasLedger) {
      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.paymentCheckout.findUnique({ where: { id: c.id } });
          if (!fresh) return;
          const again = await tx.ledgerJournalEntry.findFirst({
            where: {
              paymentCheckoutId: c.id,
              eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED,
            },
          });
          if (again) return;
          await postPaymentCapturedLedger(tx, {
            checkoutId: c.id,
            stripeEventId: String(fresh.completedByWebhookEventId),
            amountUsdCents: fresh.amountUsdCents,
          });
          await persistTrustScoreTx(tx, fresh);
        });
        stats.ledgerRepaired += 1;
        repairedCheckoutIds.add(c.id);
        await prisma.paymentCheckout.updateMany({
          where: { id: c.id },
          data: { recoveryStatus: RECOVERY_STATUS.REPAIRING },
        });
      } catch (e) {
        emitMoneyPathAlert('warn', 'ledger_repair_failed', {
          orderId: c.id,
          traceId,
          extra: { message: String(e?.message ?? e).slice(0, 200) },
        });
      }
      continue;
    }

    /** CASE 2: paid path, no attempt */
    if (
      c.orderStatus === ORDER_STATUS.PAID &&
      !att1 &&
      String(c.status ?? '') === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED
    ) {
      try {
        await prisma.$transaction(async (tx) => {
          await ensureQueuedFulfillmentAttempt(tx, c.id, undefined);
          const fresh = await tx.paymentCheckout.findUnique({ where: { id: c.id } });
          if (fresh) await persistTrustScoreTx(tx, fresh);
        });
        scheduleFulfillmentProcessing(c.id, traceId);
        stats.fulfillmentEnqueued += 1;
        repairedCheckoutIds.add(c.id);
        await prisma.paymentCheckout.updateMany({
          where: { id: c.id },
          data: { recoveryStatus: RECOVERY_STATUS.REPAIRING },
        });
      } catch (e) {
        emitMoneyPathAlert('warn', 'fulfillment_queue_repair_failed', {
          orderId: c.id,
          traceId,
          extra: { message: String(e?.message ?? e).slice(0, 200) },
        });
      }
      continue;
    }

    /** CASE 3: fulfillment without provider ref (processing) */
    if (
      att1 &&
      att1.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING &&
      !(typeof att1.providerReference === 'string' && att1.providerReference.trim())
    ) {
      await runProviderTruthVerificationForOrderId(c.id, { traceId, live: false });
      stats.providerVerifyTriggered += 1;
      repairedCheckoutIds.add(c.id);
      await prisma.paymentCheckout.updateMany({
        where: { id: c.id },
        data: { recoveryStatus: RECOVERY_STATUS.REPAIRING },
      });
      continue;
    }

    /** Default nudge: safe fulfillment dispatch */
    if (c.orderStatus === ORDER_STATUS.PAID || c.orderStatus === ORDER_STATUS.PROCESSING) {
      scheduleFulfillmentProcessing(c.id, traceId);
      stats.fulfillmentEnqueued += 1;
      repairedCheckoutIds.add(c.id);
      await prisma.paymentCheckout.updateMany({
        where: { id: c.id },
        data: { recoveryStatus: RECOVERY_STATUS.REPAIRING },
      });
    }
  }

  return {
    ok: true,
    traceId,
    ms: Date.now() - t0,
    stats,
    repairedCheckoutIds: Array.from(repairedCheckoutIds),
  };
}
