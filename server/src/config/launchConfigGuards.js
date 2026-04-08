import { env } from './env.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';

/**
 * Non-fatal startup warnings for dangerous *combinations* (fatal gates stay in productionSafetyGates.js).
 */
export function logLaunchDisciplineWarnings() {
  if (process.env.NODE_ENV === 'test') return;

  const nodeEnv = String(env.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  const qOn = isFulfillmentQueueEnabled();
  const redisUrl = String(process.env.REDIS_URL ?? '').trim();
  const fqFlag = process.env.FULFILLMENT_QUEUE_ENABLED === 'true';

  if (fqFlag && !redisUrl) {
    console.warn(
      '[launch] FULFILLMENT_QUEUE_ENABLED=true but REDIS_URL is empty — queue features will not start.',
    );
  }

  if (nodeEnv === 'production' && fqFlag && !qOn) {
    console.warn(
      '[launch] production: fulfillment queue flag set but queue not fully enabled (check REDIS_URL).',
    );
  }

  if (
    nodeEnv !== 'production' &&
    env.airtimeProvider === 'mock' &&
    env.reloadlyAllowUnavailableMockFallback
  ) {
    console.warn(
      '[launch] RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true with AIRTIME_PROVIDER=mock — fallback path is irrelevant; verify env is intentional.',
    );
  }

  if (process.env.FORTRESS_PROBE_ALLOW_NON_MOCK === 'true') {
    console.warn(
      '[launch] FORTRESS_PROBE_ALLOW_NON_MOCK=true — concurrency probes may hit real providers; keep scoped to CI/staging.',
    );
  }

  if (nodeEnv === 'production' && env.prelaunchLockdown && env.fulfillmentDispatchKillSwitch) {
    console.warn(
      '[launch] PRELAUNCH_LOCKDOWN with fulfillment dispatch kill switch — confirm this is intentional for go-live.',
    );
  }
}
