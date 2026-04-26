import { Router } from 'express';
import Redis from 'ioredis';

import { INTERNAL_TOOLING_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { staffApiErrorBody } from '../lib/staffApiError.js';
import { prisma } from '../db.js';
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js';
import { staffPrivilegedLimiter } from '../middleware/rateLimits.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { getWebTopupMetricsSnapshot } from '../lib/webTopupObservability.js';
import { safeSuffix } from '../lib/webTopupObservability.js';
import { runReconciliationScan } from '../services/reconciliationService.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { queryPhase1OperationalExceptionReport } from '../services/phase1OperationalReportService.js';
import { getPhase1OpsHealthSnapshot } from '../services/phase1OpsAggregateService.js';
import { getPhase1FulfillmentQueueMetrics } from '../queues/phase1FulfillmentQueueMetrics.js';
import { env } from '../config/env.js';
import { getPhase1FulfillmentQueue } from '../queues/phase1FulfillmentQueue.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';
import { denyUnauthenticatedInfraIfPrelaunch } from '../middleware/opsInfraHealthGate.js';
import { getMoneyPathOperatorSnapshot } from '../services/opsMoneyPathCountService.js';

const router = Router();

/**
 * Infrastructure readiness (no auth). Mounted at `/ops/health` and `/api/admin/ops/health`.
 * Under `PRELAUNCH_LOCKDOWN`, detailed DB/Redis state requires `OPS_HEALTH_TOKEN` (see opsInfraHealthGate).
 */
router.get('/health', async (req, res) => {
  if (denyUnauthenticatedInfraIfPrelaunch(req, res)) return;
  /** @type {{ server: string, db: string, redis: string, queue: string }} */
  const payload = {
    server: 'ok',
    db: 'ok',
    redis: 'skipped',
    queue: isFulfillmentQueueEnabled() ? 'enabled' : 'disabled',
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    payload.db = 'error';
  }
  const redisUrl = String(process.env.REDIS_URL ?? env.redisUrl ?? '').trim();
  if (redisUrl) {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 4000,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    try {
      await client.connect();
      await client.ping();
      payload.redis = 'ok';
    } catch {
      payload.redis = 'error';
    } finally {
      client.disconnect();
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(payload);
});
/**
 * Phase 1 MOBILE_TOPUP operational exception snapshot (DB-backed).
 * Optional `?emitStuckSignals=1` bumps in-process stuck counters (default off).
 */
router.get(
  '/phase1-report',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    const emitStuckSignals = String(req.query.emitStuckSignals ?? '') === '1';
    try {
      const report = await queryPhase1OperationalExceptionReport({
        emitStuckSignals,
      });
      req.log?.info?.(
        { traceId: req.traceId, kind: 'phase1_ops_report' },
        'phase1_ops_report',
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json(report);
    } catch (e) {
      req.log?.error({ err: e }, 'phase1_ops_report_failed');
      res
        .status(500)
        .json(
          clientErrorBody('Internal error', INTERNAL_TOOLING_CODE.OPS_INTERNAL_ERROR),
        );
    }
  },
);

/**
 * Aggregated DB + in-process Phase 1 ops view (staff).
 */
router.get(
  '/phase1-aggregated-health',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    try {
      const snapshot = await getPhase1OpsHealthSnapshot();
      req.log?.info?.(
        { traceId: req.traceId, kind: 'phase1_aggregated_ops_health' },
        'phase1_aggregated_ops_health',
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json(snapshot);
    } catch (e) {
      req.log?.error({ err: e }, 'ops_health_failed');
      res
        .status(500)
        .json(
          clientErrorBody('Internal error', INTERNAL_TOOLING_CODE.OPS_INTERNAL_ERROR),
        );
    }
  },
);

/**
 * Staff ops snapshot. Optional slices: `?phase1=1`, `?integrity=1`, `?webtopupDb=1`
 * (DB-backed WebTopup + Phase 1 `PaymentCheckout` histograms — complements in-process `webTopup` counters).
 */
router.get(
  '/summary',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    const base = {
      ops: getOpsMetricsSnapshot(),
      webTopup: getWebTopupMetricsSnapshot(),
    };
    if (String(req.query.phase1 ?? '') === '1') {
      try {
        base.phase1Ops = await getPhase1OpsHealthSnapshot();
      } catch (e) {
        req.log?.error({ err: e }, 'ops summary phase1 slice failed');
        base.phase1Ops = { ok: false, error: 'phase1_snapshot_failed' };
      }
    }
    if (String(req.query.webtopupDb ?? '') === '1') {
      try {
        const mp = await getMoneyPathOperatorSnapshot();
        base.moneyPathDbCounts = mp;
        /** @deprecated prefer `moneyPathDbCounts` — kept for older clients */
        base.webtopupDbCounts = mp;
      } catch (e) {
        req.log?.error({ err: e }, 'ops summary money path db counts failed');
        base.moneyPathDbCounts = { ok: false, error: 'money_path_db_counts_failed' };
        base.webtopupDbCounts = base.moneyPathDbCounts;
      }
    }
    if (String(req.query.integrity ?? '') === '1') {
      try {
        const scan = await runReconciliationScan();
        base.integrity = {
          scannedAt: scan.scannedAt,
          issueTotal: scan.summary.total,
          byIssueType: scan.summary.byIssueType,
        };
        /** @type {{ c: number }[]} */
        const manualCnt = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS c
          FROM "PaymentCheckout"
          WHERE "orderStatus" = ${ORDER_STATUS.PROCESSING}
            AND metadata @> '{"processingRecovery":{"manualRequired":true}}'::jsonb
        `;
        base.manualRequiredOpen = Number(manualCnt[0]?.c ?? 0);
      } catch (e) {
        req.log?.error({ err: e }, 'ops summary integrity slice failed');
        base.integrity = { error: 'integrity_scan_failed' };
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(base);
  },
);

/**
 * WebTopupOrder aggregates by payment + fulfillment status (staff).
 * Complements `/summary` in-process counters with DB-backed marketing-checkout volume.
 */
router.get(
  '/webtopup-money-path-counts',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    try {
      const snapshot = await getMoneyPathOperatorSnapshot();
      req.log?.info?.(
        { traceId: req.traceId, kind: 'money_path_operator_counts' },
        'money_path_operator_counts',
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json(snapshot);
    } catch (e) {
      req.log?.error({ err: e }, 'webtopup_money_path_counts_failed');
      res
        .status(500)
        .json(
          clientErrorBody('Internal error', INTERNAL_TOOLING_CODE.OPS_INTERNAL_ERROR),
        );
    }
  },
);

/** BullMQ Phase 1 fulfillment queue depth (staff) — overload visibility. */
router.get(
  '/fulfillment-queue',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    try {
      const snapshot = await getPhase1FulfillmentQueueMetrics();
      res.setHeader('Cache-Control', 'no-store');
      res.json(snapshot);
    } catch (e) {
      req.log?.error({ err: e }, 'fulfillment_queue_metrics_failed');
      res
        .status(500)
        .json(
          clientErrorBody('Internal error', INTERNAL_TOOLING_CODE.OPS_INTERNAL_ERROR),
        );
    }
  },
);

/**
 * Order-focused health slice for incident response (staff). Query: `?id=<paymentCheckoutId>`
 */
router.get(
  '/order-health',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    const id = String(req.query.id ?? '').trim();
    if (!id || id.length > 128) {
      return res.status(400).json(staffApiErrorBody('Missing or invalid id', 400));
    }
    try {
      const order = await prisma.paymentCheckout.findFirst({
        where: { id },
        select: {
          id: true,
          orderStatus: true,
          status: true,
          userId: true,
          failureReason: true,
          paidAt: true,
          failedAt: true,
          cancelledAt: true,
          updatedAt: true,
          metadata: true,
        },
      });
      if (!order) {
        return res.status(404).json(staffApiErrorBody('Not found', 404));
      }

      const attempts = await prisma.fulfillmentAttempt.findMany({
        where: { orderId: id },
        orderBy: { attemptNumber: 'asc' },
        select: {
          attemptNumber: true,
          status: true,
          failureReason: true,
          createdAt: true,
          completedAt: true,
          failedAt: true,
        },
      });

      const notifCount = await prisma.userNotification.count({
        where: {
          userId: order.userId,
          dedupeKey: { startsWith: `order:${id}:` },
        },
      });

      const pushDevices = await prisma.pushDevice.count({
        where: { userId: order.userId },
      });

      /** @type {Record<string, unknown>} */
      const queueHint = { fulfillmentQueueEnabled: env.fulfillmentQueueEnabled };
      if (env.fulfillmentQueueEnabled) {
        try {
          const q = getPhase1FulfillmentQueue();
          if (q) {
            const job = await q.getJob(id);
            queueHint.bullmqJobState =
              job == null ? 'no_job_record' : await job.getState();
          } else {
            queueHint.bullmqJobState = 'queue_singleton_unavailable';
          }
        } catch (e) {
          queueHint.bullmqJobError = String(e?.message ?? e).slice(0, 160);
        }
      }

      const attempt0 = attempts[0] ?? null;
      const stagingHint =
        order.orderStatus === ORDER_STATUS.PAID &&
        attempt0?.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED
          ? 'likely_queued_or_awaiting_worker'
          : order.orderStatus === ORDER_STATUS.PROCESSING
            ? 'active_processing_or_stuck_candidate'
            : order.orderStatus === ORDER_STATUS.FAILED
              ? 'terminal_failed'
              : null;

      return res.json({
        orderRefSuffix: safeSuffix(order.id, 12),
        orderStatus: order.orderStatus,
        paymentCheckoutStatus: order.status,
        hasUser: Boolean(order.userId),
        failureReason: order.failureReason,
        paidAt: order.paidAt,
        failedAt: order.failedAt,
        cancelledAt: order.cancelledAt,
        updatedAt: order.updatedAt,
        fulfillmentAttempts: attempts.length,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attemptNumber,
          status: a.status,
          failureReason: a.failureReason
            ? String(a.failureReason).slice(0, 200)
            : null,
          completedAt: a.completedAt,
          failedAt: a.failedAt,
        })),
        serverNotificationsForOrder: notifCount,
        pushDevicesForUser: pushDevices,
        stagingHint,
        ...queueHint,
        processingRecovery:
          order.metadata &&
          typeof order.metadata === 'object' &&
          !Array.isArray(order.metadata) &&
          order.metadata.processingRecovery &&
          typeof order.metadata.processingRecovery === 'object'
            ? {
                manualRequired:
                  order.metadata.processingRecovery.manualRequired === true,
                likelyDelivered:
                  order.metadata.processingRecovery.likelyDelivered === true,
                classification:
                  typeof order.metadata.processingRecovery
                    .manualRequiredClassification === 'string'
                    ? order.metadata.processingRecovery
                        .manualRequiredClassification
                    : null,
              }
            : null,
      });
    } catch (e) {
      req.log?.error({ err: e }, 'ops order-health failed');
      return res
        .status(500)
        .json(
          clientErrorBody('Internal error', INTERNAL_TOOLING_CODE.OPS_INTERNAL_ERROR),
        );
    }
  },
);

export default router;
