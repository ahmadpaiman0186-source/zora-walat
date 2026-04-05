import { env } from './env.js';
import { getAirtimeReloadlyDiagnosticsSnapshot } from './airtimeReloadlyStartup.js';

/**
 * Safe, secret-free view of launch-sensitive subsystems (health checks / startup logs).
 */
export function getLaunchSubsystemSnapshot() {
  return {
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
  };
}
