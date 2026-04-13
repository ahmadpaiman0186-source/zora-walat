import { createApp } from '../app.js';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { getConfiguredWebTopupProviderId } from '../domain/providers/webTopupProviderConfig.js';
import { getPhase1ConfiguredAirtimeProviderId } from '../domain/providers/phase1AirtimeConfig.js';
import { PROVIDER_ID } from '../domain/providers/providerIds.js';
import { validateWebTopupFulfillmentProviderConfigOrExit } from '../config/webTopupFulfillmentStartup.js';
import { logProductionReloadlyConsistencyWarnings } from '../config/productionReloadlyGuard.js';
import { assertProductionMoneyPathSafetyOrExit } from '../config/productionSafetyGates.js';
import { logLaunchDisciplineWarnings } from '../config/launchConfigGuards.js';
import { assertCriticalLaunchConfigOrExit } from '../config/criticalConfigValidation.js';
import { assertProductionDeploymentContractOrExit } from '../config/deploymentProductionContract.js';
import {
  getAirtimeReloadlyDiagnosticsSnapshot,
  validateAirtimeReloadlyConfigOrExit,
} from '../config/airtimeReloadlyStartup.js';
import { getLaunchSubsystemSnapshot } from '../config/launchSubsystemSnapshot.js';
import { webTopupLog } from '../lib/webTopupObservability.js';
import { isReloadlyConfigured } from '../services/reloadlyClient.js';
import {
  corsOriginsHaveNoWildcards,
  corsOriginsMatchPrelaunchAllowlist,
} from '../lib/corsPolicy.js';
import { getValidatedStripeSecretKey } from '../config/stripeEnv.js';
import { stripeKeyStatusLog } from '../services/stripe.js';
import { processPendingPaidOrders } from '../services/fulfillmentProcessingService.js';
import { runProcessingRecoveryTick } from '../services/processingRecoveryService.js';
import { processWebTopupFulfillmentJobs } from '../services/topupFulfillment/webtopFulfillmentJob.js';
import {
  startPhase1FulfillmentWorker,
  stopPhase1FulfillmentWorker,
} from '../queues/phase1FulfillmentWorker.js';
import { logReloadlyEnvQualityWarningsIfDev } from '../lib/reloadlyEnvQuality.js';
import {
  assertHttpAppConstructionAllowedOrThrow,
  assertWorkerRuntimeOrThrow,
  getRuntimeKind,
  RUNTIME_KIND,
} from './runtimeContext.js';

function isPostgresDatabaseUrl(url) {
  return /^postgres(ql)?:\/\//i.test(String(url ?? '').trim());
}

function validateJwtSecretsOrExit() {
  const jwtAccess = String(env.jwtAccessSecret ?? '');
  const jwtRefresh = String(env.jwtRefreshSecret ?? '');
  if (jwtAccess.length < 32 || jwtRefresh.length < 32) {
    console.error(
      '[fatal] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be set and at least 32 characters',
    );
    process.exit(1);
  }
}

function validateDatabaseConfigOrExit() {
  const dbUrl = String(env.databaseUrl ?? '').trim();
  if (env.prelaunchLockdown) {
    if (!dbUrl || !isPostgresDatabaseUrl(dbUrl)) {
      console.error(
        '[fatal] PRELAUNCH_LOCKDOWN requires DATABASE_URL (PostgreSQL connection string)',
      );
      process.exit(1);
    }
    if (!corsOriginsMatchPrelaunchAllowlist(env.corsOrigins)) {
      console.error(
        '[fatal] PRELAUNCH_LOCKDOWN requires CORS_ORIGINS to be exactly: http://localhost:3000,http://127.0.0.1:3000 (order may vary)',
      );
      process.exit(1);
    }
    if (!String(env.stripeWebhookSecret ?? '').trim()) {
      console.error(
        '[fatal] PRELAUNCH_LOCKDOWN requires STRIPE_WEBHOOK_SECRET (webhook verification)',
      );
      process.exit(1);
    }
  }

  if (env.nodeEnv === 'production') {
    if (!dbUrl || !isPostgresDatabaseUrl(dbUrl)) {
      console.error(
        '[fatal] DATABASE_URL must be set to a PostgreSQL connection string in production',
      );
      process.exit(1);
    }
    if (!getValidatedStripeSecretKey()) {
      console.error('[fatal] STRIPE_SECRET_KEY must be set in production');
      process.exit(1);
    }
    if (!String(env.stripeWebhookSecret ?? '').trim()) {
      console.error(
        '[fatal] STRIPE_WEBHOOK_SECRET must be set in production (Stripe webhook signature verification)',
      );
      process.exit(1);
    }
    if (!String(env.clientUrl ?? '').trim()) {
      console.error('[fatal] CLIENT_URL must be set in production');
      process.exit(1);
    }
    if (env.corsOrigins.length === 0) {
      console.error('[fatal] CORS_ORIGINS must be set in production (comma-separated)');
      process.exit(1);
    }
    if (!corsOriginsHaveNoWildcards(env.corsOrigins)) {
      console.error(
        '[fatal] CORS_ORIGINS must list explicit origins only (no * or wildcards)',
      );
      process.exit(1);
    }
    if (!String(process.env.ACCESS_TOKEN_TTL ?? '').trim()) {
      console.error('[fatal] ACCESS_TOKEN_TTL must be set in production (seconds)');
      process.exit(1);
    }
    if (!String(process.env.REFRESH_TOKEN_TTL ?? '').trim()) {
      console.error('[fatal] REFRESH_TOKEN_TTL must be set in production (seconds)');
      process.exit(1);
    }
    return;
  }

  if (!dbUrl) {
    console.warn(
      '[warn] DATABASE_URL unset — use PostgreSQL locally (see server/.env.example)',
    );
  } else if (!isPostgresDatabaseUrl(dbUrl)) {
    console.warn(
      '[warn] DATABASE_URL should be postgres:// or postgresql:// (SQLite is no longer supported)',
    );
  }
}

let runtimeTopologyLogged = false;
let expressAppConstructedLogged = false;

function logRuntimeTopologyOnce() {
  if (process.env.NODE_ENV === 'test' || runtimeTopologyLogged) return;
  runtimeTopologyLogged = true;
  const k = getRuntimeKind();
  const fulfillmentQueue = env.fulfillmentQueueEnabled;
  /** @type {Record<string, unknown>} */
  const capabilities =
    k === RUNTIME_KIND.WORKER
      ? {
          servesHttp: false,
          stripeWebhookHttp: false,
          bullmqConsumer: fulfillmentQueue,
          maintenanceIntervals: true,
          fulfillmentDrainLoop: true,
          processingRecoveryLoop: env.processingRecoveryEnabled,
          webtopupJobPollLoop: true,
        }
      : k === RUNTIME_KIND.SERVERLESS
        ? {
            servesHttp: true,
            stripeWebhookHttp: true,
            bullmqConsumer: false,
            maintenanceIntervals: false,
            fulfillmentDrainLoop: false,
            processingRecoveryLoop: false,
            webtopupJobPollLoop: false,
            note: 'serverless: no listen(); cold/warm instances; no background ownership',
          }
        : k === RUNTIME_KIND.API
          ? {
              servesHttp: true,
              stripeWebhookHttp: true,
              bullmqConsumer: false,
              maintenanceIntervals: false,
              fulfillmentDrainLoop: false,
              processingRecoveryLoop: false,
              webtopupJobPollLoop: false,
              note: 'long-running API: request path only; worker owns loops/queue consumer',
            }
          : {
              servesHttp: 'unknown',
              stripeWebhookHttp: 'unknown',
              bullmqConsumer: false,
              maintenanceIntervals: 'unknown',
              note:
                'ZW_RUNTIME_KIND unset — use a supported entry (start.js, fulfillment-worker.mjs, api/index.mjs)',
            };

  console.log(
    JSON.stringify({
      event: 'runtime_topology',
      schemaVersion: 1,
      zwRuntimeKind: k,
      capabilities,
    }),
  );
}

function logLaunchValidation() {
  validateWebTopupFulfillmentProviderConfigOrExit();
  validateAirtimeReloadlyConfigOrExit();
  logProductionReloadlyConsistencyWarnings();
  assertProductionMoneyPathSafetyOrExit();
  assertCriticalLaunchConfigOrExit();
  logLaunchDisciplineWarnings();

  const webTopupProviderId = getConfiguredWebTopupProviderId();
  const airtimeProviderId = getPhase1ConfiguredAirtimeProviderId();
  const reloadlyAirtimeOrWebtopup =
    webTopupProviderId === PROVIDER_ID.RELOADLY ||
    airtimeProviderId === PROVIDER_ID.RELOADLY;

  webTopupLog(undefined, 'info', 'provider_config_validated', {
    webTopupFulfillmentProvider: webTopupProviderId,
    airtimeProvider: airtimeProviderId,
    reloadlyCredentialsPresent:
      !reloadlyAirtimeOrWebtopup || isReloadlyConfigured(),
    reloadlySandboxMode: reloadlyAirtimeOrWebtopup ? env.reloadlySandbox : null,
    airtimeReloadly: getAirtimeReloadlyDiagnosticsSnapshot(),
    launchSubsystems: getLaunchSubsystemSnapshot(),
  });
  if (process.env.NODE_ENV !== 'test') {
    console.log(
      `[startup] provider_config_validated webtopup=${webTopupProviderId} airtime=${airtimeProviderId}` +
        (reloadlyAirtimeOrWebtopup
          ? ` reloadly_creds=${isReloadlyConfigured() ? 'present' : 'missing'} sandbox=${env.reloadlySandbox}`
          : ''),
    );
    logReloadlyEnvQualityWarningsIfDev();
  }
}

export function validateServerRuntimeOrExit() {
  validateJwtSecretsOrExit();
  logLaunchValidation();
  validateDatabaseConfigOrExit();
  assertProductionDeploymentContractOrExit();
  logRuntimeTopologyOnce();

  if (env.nodeEnv === 'production') {
    if (!env.loyaltyAutoGrantOnDelivery) {
      console.warn(
        '[launch] LOYALTY_AUTO_GRANT_ON_DELIVERY=false — points will not auto-grant on delivery; reconciliation may flag drift until remediated',
      );
    }
    if (!env.referralEvaluationSchedulingEnabled) {
      console.warn(
        '[launch] REFERRAL_EVALUATION_SCHEDULING_ENABLED=false — no delayed referral evaluation after delivery',
      );
    }
  }
}

export function createValidatedApp() {
  assertHttpAppConstructionAllowedOrThrow('createValidatedApp');
  if (
    env.nodeEnv === 'production' &&
    getRuntimeKind() === RUNTIME_KIND.UNSPECIFIED
  ) {
    console.error(
      JSON.stringify({
        event: 'fatal_runtime_unspecified_production',
        schemaVersion: 1,
        expected:
          'ZW_RUNTIME_KIND=api|serverless via registerApiRuntime or registerServerlessRuntime',
        actual: RUNTIME_KIND.UNSPECIFIED,
      }),
    );
    process.exit(1);
  }
  validateServerRuntimeOrExit();
  const app = createApp();
  if (process.env.NODE_ENV !== 'test' && !expressAppConstructedLogged) {
    expressAppConstructedLogged = true;
    const kind = getRuntimeKind();
    if (kind === RUNTIME_KIND.UNSPECIFIED) {
      console.warn(
        '[runtime] ZW_RUNTIME_KIND unset — supported entries set it via registerApiRuntime / registerWorkerRuntime / registerServerlessRuntime',
      );
    }
    console.log(
      JSON.stringify({
        event: 'express_app_constructed',
        schemaVersion: 1,
        zwRuntimeKind: kind,
      }),
    );
  }
  return app;
}

async function logApiStartup() {
  console.log(
    JSON.stringify({
      event: 'api_runtime_listen',
      schemaVersion: 1,
      zwRuntimeKind: RUNTIME_KIND.API,
      pid: process.pid,
      port: env.port,
    }),
  );
  console.log(
    `[startup] node pid=${process.pid} — match this to netstat LISTENING PID for port ${env.port}`,
  );
  console.log(
    `[startup] listening on port ${env.port} (all interfaces; use http://127.0.0.1:${env.port})`,
  );
  console.log(`Server running on http://127.0.0.1:${env.port}`);
  console.log(`Webhook endpoint: POST http://127.0.0.1:${env.port}/webhooks/stripe`);
  const wh = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  console.log(
    `[startup] stripe_webhook_secret=${wh ? (wh.startsWith('whsec_') ? `configured (whsec_, len=${wh.length})` : `present but bad_prefix (len=${wh.length})`) : 'MISSING'}`,
  );
  console.log(`[zora-walat-api] ${env.nodeEnv}`);
  if (env.prelaunchLockdown) {
    console.log('[pre-launch] PRELAUNCH_LOCKDOWN active — money routes return 503; strict CORS');
  }
  console.log(stripeKeyStatusLog());

  if (process.env.NODE_ENV !== 'test') {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[db] PostgreSQL: reachable');
    } catch {
      console.error(
        '[db] PostgreSQL: not reachable — check DATABASE_URL and that PostgreSQL is running',
      );
    }
    if (process.env.RELOADLY_AF_PROBE_ON_STARTUP === 'false') {
      console.log(
        '[reloadly] AF startup probe skipped (RELOADLY_AF_PROBE_ON_STARTUP=false)',
      );
    } else {
      import('../utils/reloadlyAfOperatorsProbe.js')
        .then((m) => m.logReloadlyAfOperatorsSample())
        .catch((e) => console.error('[reloadly] AF operators probe failed', e));
    }
  }
}

export function startApiRuntime() {
  const kind = getRuntimeKind();
  if (kind !== RUNTIME_KIND.API) {
    console.error(
      JSON.stringify({
        event: 'fatal_runtime_mismatch',
        schemaVersion: 1,
        expectedZwRuntimeKind: RUNTIME_KIND.API,
        actual: kind,
        hint: 'Run via start.js (imports registerApiRuntime.js before bootstrap)',
      }),
    );
    process.exit(1);
  }
  const app = createValidatedApp();
  return app.listen(env.port, () => {
    void logApiStartup();
  });
}

function startIntervalLoop(name, intervalMs, fn) {
  if (!(intervalMs > 0) || process.env.NODE_ENV === 'test') {
    return null;
  }
  assertWorkerRuntimeOrThrow(`interval:${name}`);
  return setInterval(() => {
    fn().catch((e) => {
      console.error(`[worker-maintenance] ${name}`, e);
    });
  }, intervalMs);
}

export function startBackgroundWorkerRuntime() {
  const kind = getRuntimeKind();
  if (kind !== RUNTIME_KIND.WORKER) {
    console.error(
      JSON.stringify({
        event: 'fatal_runtime_mismatch',
        schemaVersion: 1,
        expectedZwRuntimeKind: RUNTIME_KIND.WORKER,
        actual: kind,
        hint: 'Run via fulfillment-worker.mjs (imports registerWorkerRuntime.js before bootstrap)',
      }),
    );
    process.exit(1);
  }
  validateServerRuntimeOrExit();
  console.log(
    JSON.stringify({
      event: 'worker_runtime_boot',
      schemaVersion: 1,
      zwRuntimeKind: RUNTIME_KIND.WORKER,
      pid: process.pid,
    }),
  );
  const cleanup = [];

  if (env.fulfillmentQueueEnabled) {
    const worker = startPhase1FulfillmentWorker();
    if (!worker) {
      console.error(
        '[background-worker] BullMQ worker did not start (check REDIS_URL and queue config)',
      );
      process.exit(1);
    }
  } else {
    console.log(
      '[background-worker] fulfillment queue disabled — maintenance loops only',
    );
  }

  const drainMs = Number(process.env.FULFILLMENT_DRAIN_INTERVAL_MS ?? 120_000);
  const drainLoop = startIntervalLoop('processPendingPaidOrders', drainMs, () =>
    processPendingPaidOrders({ limit: 25 }),
  );
  if (drainLoop) cleanup.push(drainLoop);

  const recoveryLoop = startIntervalLoop(
    'processingRecoveryTick',
    env.processingRecoveryEnabled ? env.processingRecoveryPollMs : 0,
    () => runProcessingRecoveryTick(),
  );
  if (recoveryLoop) cleanup.push(recoveryLoop);

  const webTopupLoop = startIntervalLoop(
    'processWebTopupFulfillmentJobs',
    env.webtopupFulfillmentJobPollMs,
    () => processWebTopupFulfillmentJobs({ limit: 15 }),
  );
  if (webTopupLoop) cleanup.push(webTopupLoop);

  console.log(
    JSON.stringify({
      backgroundWorker: true,
      zwRuntimeKind: RUNTIME_KIND.WORKER,
      event: 'background_runtime_started',
      schemaVersion: 1,
      fulfillmentQueueEnabled: env.fulfillmentQueueEnabled,
      fulfillmentDrainIntervalMs: drainMs,
      processingRecoveryPollMs: env.processingRecoveryEnabled
        ? env.processingRecoveryPollMs
        : 0,
      webTopupFulfillmentJobPollMs: env.webtopupFulfillmentJobPollMs,
      t: new Date().toISOString(),
    }),
  );

  return async function shutdownBackgroundWorkerRuntime() {
    for (const handle of cleanup) {
      clearInterval(handle);
    }
    await stopPhase1FulfillmentWorker();
  };
}
