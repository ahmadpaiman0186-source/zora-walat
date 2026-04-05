import { env } from './env.js';
import { isReloadlyConfigured } from '../services/reloadlyClient.js';

/**
 * Startup-time checks: Reloadly credential presence vs provider selection, sandbox vs prod hints.
 * Does not exit the process — logs only (operators fix env).
 */
export function logProductionReloadlyConsistencyWarnings() {
  const provider = String(env.webTopupFulfillmentProvider ?? 'mock')
    .trim()
    .toLowerCase();
  if (provider === 'reloadly') {
    if (!isReloadlyConfigured()) {
      console.error(
        '[security] WEBTOPUP_FULFILLMENT_PROVIDER=reloadly but Reloadly credentials are missing',
      );
    }
    if (env.nodeEnv === 'production' && env.reloadlySandbox) {
      console.warn(
        '[security] Production NODE_ENV with RELOADLY_SANDBOX=true — confirm intentional sandbox audience',
      );
    }
    if (env.nodeEnv !== 'production' && !env.reloadlySandbox) {
      console.warn(
        '[security] Development with Reloadly production Topups host — use RELOADLY_SANDBOX=true for local exercises',
      );
    }
  }
  if (env.fulfillmentDispatchKillSwitch) {
    console.warn(
      '[ops] FULFILLMENT_DISPATCH_KILL_SWITCH=true — all web top-up dispatch/retry will return 503',
    );
  }
  if (!env.fulfillmentDispatchEnabled) {
    console.warn(
      '[ops] FULFILLMENT_DISPATCH_ENABLED=false — web top-up fulfillment dispatch is off',
    );
  }
  if (provider === 'reloadly' && !env.reloadlyWebTopupProviderActive) {
    console.warn(
      '[ops] RELOADLY_WEBTOPUP_PROVIDER_ACTIVE=false — Reloadly dispatch disabled; mock may still run',
    );
  }
}
