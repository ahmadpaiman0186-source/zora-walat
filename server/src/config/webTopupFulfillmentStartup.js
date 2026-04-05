import { env } from './env.js';
import { isReloadlyConfigured } from '../services/reloadlyClient.js';

/**
 * @param {string} providerIdNormalized
 * @param {() => boolean} reloadlyConfigured
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateWebTopupFulfillmentProviderConfigFrom(
  providerIdNormalized,
  reloadlyConfigured,
) {
  const p = String(providerIdNormalized ?? 'mock').trim().toLowerCase();
  if (p !== 'reloadly') {
    return { ok: true };
  }
  if (!reloadlyConfigured()) {
    return {
      ok: false,
      message:
        'WEBTOPUP_FULFILLMENT_PROVIDER=reloadly requires RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET',
    };
  }
  return { ok: true };
}

/**
 * Validate env when a real web top-up provider is selected (fail-fast).
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateWebTopupFulfillmentProviderConfig() {
  return validateWebTopupFulfillmentProviderConfigFrom(
    String(env.webTopupFulfillmentProvider ?? 'mock').trim().toLowerCase(),
    isReloadlyConfigured,
  );
}

export function validateWebTopupFulfillmentProviderConfigOrExit() {
  const r = validateWebTopupFulfillmentProviderConfig();
  if (!r.ok) {
    console.error(`[fatal] ${r.message}`);
    process.exit(1);
  }
}
