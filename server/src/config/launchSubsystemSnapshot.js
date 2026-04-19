import { env } from './env.js';
import { getAirtimeReloadlyDiagnosticsSnapshot } from './airtimeReloadlyStartup.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';
import { getHttpRateLimitSnapshot } from '../lib/rateLimitRedisInit.js';

/**
 * Safe, secret-free view of launch-sensitive subsystems (health checks / startup logs).
 */
export function getLaunchSubsystemSnapshot() {
  const fb = String(env.webtopupFallbackProvider ?? '').trim();
  return {
    httpRateLimit: getHttpRateLimitSnapshot(),
    prelaunchLockdown: env.prelaunchLockdown,
    nodeEnv: env.nodeEnv,
    /** Phase 1 airtime: `mock` | `reloadly` (see `deliveryAdapter.js`). */
    airtimeProvider: env.airtimeProvider,
    airtimeReloadly: getAirtimeReloadlyDiagnosticsSnapshot(),
    webTopupFulfillmentProvider: env.webTopupFulfillmentProvider,
    webtopupReliabilityEnabled: env.webtopupReliabilityEnabled,
    webtopupFallbackProvider: fb || null,
    fulfillmentDispatchEnabled: env.fulfillmentDispatchEnabled,
    fulfillmentDispatchKillSwitch: env.fulfillmentDispatchKillSwitch,
    reloadlyWebTopupProviderActive: env.reloadlyWebTopupProviderActive,
    processingRecoveryEnabled: env.processingRecoveryEnabled,
    processingRecoveryPollMs: env.processingRecoveryPollMs,
    pushNotificationsEnabled: env.pushNotificationsEnabled,
    loyaltyAutoGrantOnDelivery: env.loyaltyAutoGrantOnDelivery,
    referralEvaluationSchedulingEnabled: env.referralEvaluationSchedulingEnabled,
    referralEnabledEnv:
      String(process.env.REFERRAL_ENABLED ?? '').trim() !== ''
        ? String(process.env.REFERRAL_ENABLED).trim()
        : null,
    fulfillmentQueueEnabled: isFulfillmentQueueEnabled(),
    metricsPrometheusEnabled: env.metricsPrometheusEnabled,
    metricsRedisAggregation: env.metricsRedisAggregation,
    instanceId: env.instanceId,
  };
}
