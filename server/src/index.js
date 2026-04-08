import { createApp } from './app.js';
import { prisma } from './db.js';
import { env } from './config/env.js';
import { validateWebTopupFulfillmentProviderConfigOrExit } from './config/webTopupFulfillmentStartup.js';
import { logProductionReloadlyConsistencyWarnings } from './config/productionReloadlyGuard.js';
import { assertProductionMoneyPathSafetyOrExit } from './config/productionSafetyGates.js';
import { logLaunchDisciplineWarnings } from './config/launchConfigGuards.js';
import { assertCriticalLaunchConfigOrExit } from './config/criticalConfigValidation.js';
import {
  getAirtimeReloadlyDiagnosticsSnapshot,
  validateAirtimeReloadlyConfigOrExit,
} from './config/airtimeReloadlyStartup.js';
import { getLaunchSubsystemSnapshot } from './config/launchSubsystemSnapshot.js';
import { webTopupLog } from './lib/webTopupObservability.js';
import { isReloadlyConfigured } from './services/reloadlyClient.js';
import {
  corsOriginsHaveNoWildcards,
  corsOriginsMatchPrelaunchAllowlist,
} from './lib/corsPolicy.js';
import { getValidatedStripeSecretKey } from './config/stripeEnv.js';
import { stripeKeyStatusLog } from './services/stripe.js';
import { processPendingPaidOrders } from './services/fulfillmentProcessingService.js';
import { runProcessingRecoveryTick } from './services/processingRecoveryService.js';
import { processWebTopupFulfillmentJobs } from './services/topupFulfillment/webtopFulfillmentJob.js';
import { startPhase1FulfillmentWorker } from './queues/phase1FulfillmentWorker.js';

function isPostgresDatabaseUrl(url) {
  return /^postgres(ql)?:\/\//i.test(String(url ?? '').trim());
}

const jwtAccess = String(env.jwtAccessSecret ?? '');
const jwtRefresh = String(env.jwtRefreshSecret ?? '');
if (jwtAccess.length < 32 || jwtRefresh.length < 32) {
  console.error(
    '[fatal] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be set and at least 32 characters',
  );
  process.exit(1);
}

validateWebTopupFulfillmentProviderConfigOrExit();
validateAirtimeReloadlyConfigOrExit();
logProductionReloadlyConsistencyWarnings();
assertProductionMoneyPathSafetyOrExit();
assertCriticalLaunchConfigOrExit();
logLaunchDisciplineWarnings();

const webTopupProviderId = String(env.webTopupFulfillmentProvider ?? 'mock')
  .trim()
  .toLowerCase();
const airtimeProviderId = String(env.airtimeProvider ?? 'mock')
  .trim()
  .toLowerCase();
const reloadlyAirtimeOrWebtopup =
  webTopupProviderId === 'reloadly' || airtimeProviderId === 'reloadly';

webTopupLog(undefined, 'info', 'provider_config_validated', {
  webTopupFulfillmentProvider: webTopupProviderId,
  airtimeProvider: airtimeProviderId,
  reloadlyCredentialsPresent:
    !reloadlyAirtimeOrWebtopup || isReloadlyConfigured(),
  /** Topups API audience: sandbox host when true (shared by airtime + web top-up adapters). */
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
}

if (env.prelaunchLockdown) {
  const dbUrl = String(env.databaseUrl ?? '').trim();
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
  const dbUrl = String(env.databaseUrl ?? '').trim();
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
} else {
  const dbUrl = String(env.databaseUrl ?? '').trim();
  if (!dbUrl) {
    console.warn(
      '[warn] DATABASE_URL unset — use PostgreSQL locally (see server/.env.example)',
    );
  } else if (!isPostgresDatabaseUrl(dbUrl)) {
    console.warn(
      '[warn] DATABASE_URL should be postgres:// or postgresql:// (SQLite is no longer supported)',
    );
  }
  if (!env.stripeWebhookSecret) {
    console.warn(
      '[warn] STRIPE_WEBHOOK_SECRET unset — set it to verify checkout.session.completed webhooks',
    );
  }
}

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

const app = createApp();

app.listen(env.port, async () => {
  console.log(`Server running on http://127.0.0.1:${env.port}`);
  console.log(`[zora-walat-api] ${env.nodeEnv}`);
  if (env.prelaunchLockdown) {
    console.log('[pre-launch] PRELAUNCH_LOCKDOWN active — money routes return 503; strict CORS');
  }
  console.log(stripeKeyStatusLog());

  if (env.fulfillmentQueueEnabled) {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test'
    ) {
      startPhase1FulfillmentWorker();
      console.log(
        '[fulfillment-queue] embedded BullMQ worker started (non-production)',
      );
    } else {
      console.log(
        '[fulfillment-queue] FULFILLMENT_QUEUE_ENABLED — run `npm run worker:fulfillment` in a separate process (production)',
      );
    }
  }

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
      import('./utils/reloadlyAfOperatorsProbe.js')
        .then((m) => m.logReloadlyAfOperatorsSample())
        .catch((e) => console.error('[reloadly] AF operators probe failed', e));
    }
  }

  /** Drain queued fulfillment attempts (backup if post-webhook scheduling misses). */
  const drainMs = Number(process.env.FULFILLMENT_DRAIN_INTERVAL_MS ?? 120_000);
  if (drainMs > 0 && process.env.NODE_ENV !== 'test') {
    setInterval(() => {
      processPendingPaidOrders({ limit: 25 }).catch((e) => {
        console.error('[fulfillment] processPendingPaidOrders', e);
      });
    }, drainMs);
  }

  const recoveryPollMs = env.processingRecoveryPollMs;
  if (
    recoveryPollMs > 0 &&
    env.processingRecoveryEnabled &&
    process.env.NODE_ENV !== 'test'
  ) {
    setInterval(() => {
      runProcessingRecoveryTick().catch((e) => {
        console.error('[fulfillment] processingRecoveryTick', e);
      });
    }, recoveryPollMs);
  }

  const jobPollMs = env.webtopupFulfillmentJobPollMs;
  if (jobPollMs > 0 && process.env.NODE_ENV !== 'test') {
    setInterval(() => {
      processWebTopupFulfillmentJobs({ limit: 15 }).catch((e) => {
        console.error('[fulfillment] processWebTopupFulfillmentJobs', e);
      });
    }, jobPollMs);
  }
});
