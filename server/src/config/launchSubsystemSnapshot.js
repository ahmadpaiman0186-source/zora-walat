import { env } from './env.js';
import { getAirtimeReloadlyDiagnosticsSnapshot } from './airtimeReloadlyStartup.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';
import { getHttpRateLimitSnapshot } from '../lib/rateLimitRedisInit.js';

/**
 * Safe, secret-free view of launch-sensitive subsystems (health checks / startup logs).
 */
export function getLaunchSubsystemSnapshot() {
  return {
    httpRateLimit: getHttpRateLimitSnapshot(),
    prelaunchLockdown: env.prelaunchLockdown,
    nodeEnv: env.nodeEnv,
    airtimeReloadly: getAirtimeReloadlyDiagnosticsSnapshot(),
    webTopupFulfillmentProvider: env.webTopupFulfillmentProvider,
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
