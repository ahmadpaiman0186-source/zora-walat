/**
 * Fulfillment SLA: PAID/PROCESSING without terminal delivery beyond threshold → alert + recovery.
 */

import { randomUUID } from 'node:crypto';

import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { RECOVERY_STATUS } from '../constants/recoveryStatus.js';
import { emitMoneyPathAlert } from './moneyPathAlertService.js';
import { scheduleFulfillmentProcessing } from './fulfillmentProcessingService.js';
import {
  bumpFinancialSlaBreachMetric,
  bumpFinancialSlaStillOverdueMetric,
  emitResilienceStructuredLog,
} from '../utils/metrics.js';

/**
 * @param {{ traceId?: string | null, limit?: number }} [opts]
 * @returns {Promise<{ scanned: number, firstBreaches: number, requeued: number, ms: number }>}
 */
export async function runSlaGuardTick(opts = {}) {
  const traceId = opts.traceId ?? randomUUID();
  const limit = Math.min(Math.max(opts.limit ?? 15, 1), 50);
  const t0 = Date.now();
  const slaMs = env.paidFulfillmentSlaMs;
  const deadline = new Date(Date.now() - slaMs);

  const rows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: { in: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING] },
      paidAt: { lte: deadline },
    },
    select: {
      id: true,
      orderStatus: true,
      paidAt: true,
      slaBreachedAt: true,
    },
    orderBy: { paidAt: 'asc' },
    take: limit,
  });

  let firstBreaches = 0;
  let requeued = 0;

  for (const row of rows) {
    const first = row.slaBreachedAt == null;
    const up = await prisma.paymentCheckout.updateMany({
      where: {
        id: row.id,
        orderStatus: { in: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING] },
        ...(first ? { slaBreachedAt: null } : {}),
      },
      data: {
        slaBreachedAt: row.slaBreachedAt ?? new Date(),
        recoveryStatus: RECOVERY_STATUS.REPAIRING,
      },
    });
    if (up.count === 0) continue;

    requeued += 1;
    scheduleFulfillmentProcessing(row.id, traceId);

    if (first) {
      firstBreaches += 1;
      bumpFinancialSlaBreachMetric();
      emitMoneyPathAlert('critical', 'sla_fulfillment_breach', {
        orderId: row.id,
        traceId,
        extra: {
          slaMs,
          paidAt: row.paidAt?.toISOString?.() ?? null,
          orderStatus: row.orderStatus,
        },
      });
      emitResilienceStructuredLog({
        orderId: row.id,
        checkoutId: row.id,
        stage: 'recovery',
        status: 'sla_breach',
        traceId,
        extra: { slaMs, firstBreach: true },
      });
    } else {
      bumpFinancialSlaStillOverdueMetric();
    }
  }

  return {
    scanned: rows.length,
    firstBreaches,
    requeued,
    ms: Date.now() - t0,
  };
}
