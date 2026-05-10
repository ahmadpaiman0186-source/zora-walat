import { Router } from 'express';

import {
  raceReadinessOperation,
  runReadinessDatabaseCore,
  READINESS_DB_EXTENDED_MS,
  READINESS_QUEUE_PROBE_MS,
} from '../lib/readinessBoundedChecks.js';
import { sendLivenessJsonOk } from '../lib/sendLivenessJsonOk.js';
import { denyUnauthenticatedInfraIfPrelaunch } from '../middleware/opsInfraHealthGate.js';

const router = Router();

async function getHealthDeps() {
  const [
    { prisma },
    { env },
    { getWebTopupMetricsSnapshot },
    { getOpsMetricsSnapshot },
    { renderPrometheusTextFromOps },
    { getWebTopupFulfillmentStuckSummary },
    { getTopupProviderCircuitSnapshot },
    { getReliabilityWatchdogSnapshot },
    { getAirtimeReloadlyDiagnosticsSnapshot },
    { getLaunchSubsystemSnapshot },
  ] = await Promise.all([
    import('../db.js'),
    import('../config/env.js'),
    import('../lib/webTopupObservability.js'),
    import('../lib/opsMetrics.js'),
    import('../lib/prometheusTextFormat.js'),
    import('../services/webtopStuckOrders.js'),
    import('../services/topupFulfillment/topupProviderCircuit.js'),
    import('../services/reliability/watchdog.js'),
    import('../config/airtimeReloadlyStartup.js'),
    import('../config/launchSubsystemSnapshot.js'),
  ]);

  return {
    prisma,
    env,
    getWebTopupMetricsSnapshot,
    getOpsMetricsSnapshot,
    renderPrometheusTextFromOps,
    getWebTopupFulfillmentStuckSummary,
    getTopupProviderCircuitSnapshot,
    getReliabilityWatchdogSnapshot,
    getAirtimeReloadlyDiagnosticsSnapshot,
    getLaunchSubsystemSnapshot,
  };
}

function walletTopupContractSnapshot(env) {
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

/** Liveness — must stay public, JSON, and free of optional service dependencies. */
router.get('/', (_req, res) => {
  sendLivenessJsonOk(res);
});

/** Liveness — must stay public, JSON, and free of optional service dependencies. */
router.get('/health', (_req, res) => {
  sendLivenessJsonOk(res);
});

/** Prometheus scrape (opt-in via METRICS_PROMETHEUS_ENABLED=true). */
router.get('/metrics', async (req, res, next) => {
  try {
    const { env, renderPrometheusTextFromOps } = await getHealthDeps();
    if (denyUnauthenticatedInfraIfPrelaunch(req, res)) return;
    if (!env.metricsPrometheusEnabled) {
      res.status(404).setHeader('Cache-Control', 'no-store').end();
      return;
    }
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
router.get('/ready', async (req, res) => {
  if (denyUnauthenticatedInfraIfPrelaunch(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const {
    prisma,
    env,
    getWebTopupMetricsSnapshot,
    getOpsMetricsSnapshot,
    getWebTopupFulfillmentStuckSummary,
    getTopupProviderCircuitSnapshot,
    getReliabilityWatchdogSnapshot,
    getAirtimeReloadlyDiagnosticsSnapshot,
    getLaunchSubsystemSnapshot,
  } = await getHealthDeps();

  const core = await runReadinessDatabaseCore(prisma);
  if (!core.ok) {
    return res.status(503).json({
      status: 'unavailable',
      readinessReason: core.readinessReason,
      checks: core.checks,
      walletTopupContract: walletTopupContractSnapshot(env),
      webTopupMetrics: getWebTopupMetricsSnapshot(),
      opsMetrics: getOpsMetricsSnapshot(),
    });
  }
  /** @type {{ database?: string, webTopupPersistence?: string }} */
  const checks = { ...core.checks };

  let webTopupStuck = null;
  try {
    webTopupStuck = await raceReadinessOperation(
      getWebTopupFulfillmentStuckSummary(),
      READINESS_DB_EXTENDED_MS,
      'db_probe_timeout',
    );
  } catch (e) {
    if (e?.code === 'db_probe_timeout') {
      return res.status(503).json({
        status: 'unavailable',
        readinessReason: 'db_probe_timeout',
        checks: { ...checks, webTopupStuckProbe: 'timeout' },
        walletTopupContract: walletTopupContractSnapshot(env),
        webTopupMetrics: getWebTopupMetricsSnapshot(),
        opsMetrics: getOpsMetricsSnapshot(),
      });
    }
    webTopupStuck = { error: 'stuck_summary_unavailable' };
  }

  /** @type {number | null} */
  let webTopupFulfillmentJobsQueued = null;
  try {
    webTopupFulfillmentJobsQueued = await raceReadinessOperation(
      prisma.webTopupFulfillmentJob.count({
        where: { status: 'queued' },
      }),
      READINESS_DB_EXTENDED_MS,
      'db_probe_timeout',
    );
  } catch (e) {
    if (e?.code === 'db_probe_timeout') {
      return res.status(503).json({
        status: 'unavailable',
        readinessReason: 'db_probe_timeout',
        checks: { ...checks, webTopupFulfillmentJobCount: 'timeout' },
        walletTopupContract: walletTopupContractSnapshot(env),
        webTopupMetrics: getWebTopupMetricsSnapshot(),
        opsMetrics: getOpsMetricsSnapshot(),
      });
    }
    webTopupFulfillmentJobsQueued = null;
  }

  /** @type {Record<string, number> | { error: string }} */
  let paymentCheckoutByOrderStatus24h = {};
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await raceReadinessOperation(
      prisma.paymentCheckout.groupBy({
        by: ['orderStatus'],
        where: { updatedAt: { gte: since } },
        _count: { _all: true },
      }),
      READINESS_DB_EXTENDED_MS,
      'db_probe_timeout',
    );
    paymentCheckoutByOrderStatus24h = Object.fromEntries(
      rows.map((r) => [r.orderStatus, r._count._all]),
    );
  } catch (e) {
    if (e?.code === 'db_probe_timeout') {
      return res.status(503).json({
        status: 'unavailable',
        readinessReason: 'db_probe_timeout',
        checks: { ...checks, paymentCheckoutGroupBy24h: 'timeout' },
        walletTopupContract: walletTopupContractSnapshot(env),
        webTopupMetrics: getWebTopupMetricsSnapshot(),
        opsMetrics: getOpsMetricsSnapshot(),
      });
    }
    paymentCheckoutByOrderStatus24h = { error: 'payment_checkout_health_unavailable' };
  }

  /** @type {Awaited<ReturnType<typeof import('../lib/phase1FulfillmentQueueObservation.js').getPhase1FulfillmentQueueObservation>>} */
  let phase1FulfillmentQueue = { available: false, reason: 'not_loaded' };
  try {
    const { getPhase1FulfillmentQueueObservation } = await import(
      '../lib/phase1FulfillmentQueueObservation.js'
    );
    phase1FulfillmentQueue = await raceReadinessOperation(
      getPhase1FulfillmentQueueObservation(),
      READINESS_QUEUE_PROBE_MS,
      'queue_timeout',
    );
  } catch (e) {
    if (e?.code === 'queue_timeout') {
      return res.status(503).json({
        status: 'unavailable',
        readinessReason: 'queue_timeout',
        checks: { ...checks, phase1FulfillmentQueue: 'timeout' },
        walletTopupContract: walletTopupContractSnapshot(env),
        webTopupMetrics: getWebTopupMetricsSnapshot(),
        opsMetrics: getOpsMetricsSnapshot(),
      });
    }
    phase1FulfillmentQueue = {
      available: false,
      reason: 'queue_observation_import_failed',
      detail: String(e?.message ?? e).slice(0, 160),
    };
  }

  const { getValidatedStripeSecretKey } = await import('../config/stripeEnv.js');
  const wh = String(env.stripeWebhookSecret ?? '').trim();

  return res.status(200).json({
    status: 'ready',
    checks,
    /** Runtime API contract hints (not a substitute for `npm run gate:check`). */
    walletTopupContract: walletTopupContractSnapshot(env),
    webTopupMetrics: getWebTopupMetricsSnapshot(),
    opsMetrics: getOpsMetricsSnapshot(),
    paymentCheckoutByOrderStatus24h,
    webTopupFulfillmentStuck: webTopupStuck,
    topupProviderCircuits: getTopupProviderCircuitSnapshot(),
    reliabilityWatchdog: getReliabilityWatchdogSnapshot(),
    webTopupFulfillmentJobsQueued,
    phase1FulfillmentQueue,
    airtimeReloadly: getAirtimeReloadlyDiagnosticsSnapshot(),
    launchSubsystems: getLaunchSubsystemSnapshot(),
    /** Secret-free: whether Stripe money path env is present (webhook authority is server-side only). */
    stripeMoneyPath: {
      apiKeyConfigured: Boolean(getValidatedStripeSecretKey()),
      webhookSigningSecretConfigured: wh.length > 0,
      webhookSigningSecretWellFormed: wh.startsWith('whsec_'),
    },
  });
});

export default router;
