import { Router } from 'express';

import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { getWebTopupMetricsSnapshot } from '../lib/webTopupObservability.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { renderPrometheusTextFromOps } from '../lib/prometheusTextFormat.js';
import { getWebTopupFulfillmentStuckSummary } from '../services/webtopStuckOrders.js';
import { getTopupProviderCircuitSnapshot } from '../services/topupFulfillment/topupProviderCircuit.js';
import { getAirtimeReloadlyDiagnosticsSnapshot } from '../config/airtimeReloadlyStartup.js';
import { getLaunchSubsystemSnapshot } from '../config/launchSubsystemSnapshot.js';
import { sendLivenessJsonOk } from '../lib/sendLivenessJsonOk.js';

const router = Router();

function walletTopupContractSnapshot() {
  return {
    requireIdempotencyKey: env.requireWalletTopupIdempotencyKey,
    idempotencyKeyFormat: 'uuid_v4',
    persistence: 'postgres:WalletTopupIdempotency',
    /** Append-only economic credits per user (`UserWalletLedgerEntry`). Balance reads remain `UserWallet`. */
    ledgerModel: 'postgres:UserWalletLedgerEntry',
    ledgerDbImmutability:
      'trigger blocks UPDATE (DELETE allowed for User FK cascade / retention policies)',
    postTopupLedgerVerify:
      'main balanceUsdCents vs Σ ledger(reason in wallet_topup*) only; strict mode optional',
    structuredLogs: 'stdout JSON lines event=wallet_topup (see walletTopupStructuredLog.js)',
    maxTopupUsdCentsConfigured: env.walletTopupMaxUsdCents,
    topupPerMinuteMax: env.walletTopupPerMinuteMax,
    topupRouteRateLimiters:
      'walletTopupPerMinuteLimiter(1m) + walletTopupLimiter(15m) per user+IP',
    auditLogEvents: [
      'wallet_topup_applied',
      'wallet_topup_replay',
      'wallet_topup_legacy_applied',
      'wallet_topup_idempotency_conflict',
      'wallet_topup_idempotency_required',
      'wallet_topup_idempotency_invalid',
      'wallet_topup_amount_rejected',
    ],
    httpRejectionCodes: [
      'wallet_topup_rate_limited',
      'wallet_topup_per_minute_limited',
      'wallet_topup_amount_out_of_range',
      'wallet_ledger_invariant_violation',
      'wallet_topup_idempotency_required',
      'wallet_topup_idempotency_invalid',
      'wallet_topup_idempotency_conflict',
    ],
    countersPrefix: 'money_path_wallet_topup',
    loadVerification: {
      functional: 'npm run verify:wallet',
      loadReplaySemantics: 'npm run load:wallet:replay',
      loadApplyThroughput: 'npm run load:wallet:apply',
      smokeUnauthed: 'npm run smoke:wallet:unauthed',
      smokeNoIdempotencyHeader: 'npm run smoke:wallet:no-idem',
      ledgerInvariantDoc: 'server/docs/WALLET_LEDGER_INVARIANT.md',
      ledgerTopupDoc: 'server/docs/WALLET_TOPUP_LEDGER.md',
    },
    bullMqPhase1Fulfillment: {
      primaryQueue: 'phase1-fulfillment-v1',
      deadLetterQueue: 'phase1-fulfillment-dlq-v1',
      jobMaxAttempts: env.fulfillmentJobMaxAttempts,
      exponentialBackoffMs: env.fulfillmentJobBackoffMs,
    },
  };
}

/** Liveness — process up (safe behind LB without hitting DB). */
router.get('/health', (_req, res) => {
  sendLivenessJsonOk(res);
});

/** Prometheus scrape (opt-in via METRICS_PROMETHEUS_ENABLED=true). */
router.get('/metrics', async (_req, res, next) => {
  if (!env.metricsPrometheusEnabled) {
    res.status(404).setHeader('Cache-Control', 'no-store').end();
    return;
  }
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.type('text/plain; version=0.0.4; charset=utf-8');
    const body = await renderPrometheusTextFromOps();
    res.status(200).send(body);
  } catch (e) {
    next(e);
  }
});

/**
 * Readiness — PostgreSQL + `WebTopupOrder` storage reachable.
 * Includes in-process web top-up metrics (counters since process start).
 */
router.get('/ready', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  /** @type {{ database?: string, webTopupPersistence?: string }} */
  const checks = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'failed';
    checks.webTopupPersistence = 'skipped';
    return res.status(503).json({
      status: 'unavailable',
      checks,
      walletTopupContract: walletTopupContractSnapshot(),
      webTopupMetrics: getWebTopupMetricsSnapshot(),
      opsMetrics: getOpsMetricsSnapshot(),
    });
  }
  try {
    await prisma.webTopupOrder.findFirst({ select: { id: true } });
    checks.webTopupPersistence = 'ok';
  } catch {
    checks.webTopupPersistence = 'failed';
    return res.status(503).json({
      status: 'unavailable',
      checks,
      walletTopupContract: walletTopupContractSnapshot(),
      webTopupMetrics: getWebTopupMetricsSnapshot(),
      opsMetrics: getOpsMetricsSnapshot(),
    });
  }
  let webTopupStuck = null;
  try {
    webTopupStuck = await getWebTopupFulfillmentStuckSummary();
  } catch {
    webTopupStuck = { error: 'stuck_summary_unavailable' };
  }

  /** @type {number | null} */
  let webTopupFulfillmentJobsQueued = null;
  try {
    webTopupFulfillmentJobsQueued = await prisma.webTopupFulfillmentJob.count({
      where: { status: 'queued' },
    });
  } catch {
    webTopupFulfillmentJobsQueued = null;
  }

  /** @type {Record<string, number> | { error: string }} */
  let paymentCheckoutByOrderStatus24h = {};
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await prisma.paymentCheckout.groupBy({
      by: ['orderStatus'],
      where: { updatedAt: { gte: since } },
      _count: { _all: true },
    });
    paymentCheckoutByOrderStatus24h = Object.fromEntries(
      rows.map((r) => [r.orderStatus, r._count._all]),
    );
  } catch {
    paymentCheckoutByOrderStatus24h = { error: 'payment_checkout_health_unavailable' };
  }

  return res.status(200).json({
    status: 'ready',
    checks,
    /** Runtime API contract hints (not a substitute for `npm run gate:check`). */
    walletTopupContract: walletTopupContractSnapshot(),
    webTopupMetrics: getWebTopupMetricsSnapshot(),
    opsMetrics: getOpsMetricsSnapshot(),
    paymentCheckoutByOrderStatus24h,
    webTopupFulfillmentStuck: webTopupStuck,
    topupProviderCircuits: getTopupProviderCircuitSnapshot(),
    webTopupFulfillmentJobsQueued,
    airtimeReloadly: getAirtimeReloadlyDiagnosticsSnapshot(),
    launchSubsystems: getLaunchSubsystemSnapshot(),
  });
});

export default router;
