import { currentNodeEnvLabel, envStrictTrue } from './localCheckoutProofRuntime.js';

/**
 * Local-only dev checkout auth bypass: env gate (no request headers).
 * Never true in production or test, regardless of env strings.
 *
 * @returns {boolean}
 */
export function isDevCheckoutAuthBypassRuntimeConfigured() {
  const ne = currentNodeEnvLabel();
  if (ne === 'production' || ne === 'test') return false;
  if (!envStrictTrue(process.env.DEV_CHECKOUT_AUTH_BYPASS)) return false;
  const secret = String(process.env.DEV_CHECKOUT_BYPASS_SECRET ?? '').trim();
  const userId = String(process.env.DEV_CHECKOUT_BYPASS_USER_ID ?? '').trim();
  return secret.length >= 16 && userId.length > 0;
}

/** @returns {string} */
export function devCheckoutBypassSecretForCompare() {
  return String(process.env.DEV_CHECKOUT_BYPASS_SECRET ?? '').trim();
}

/** @returns {string} */
export function devCheckoutBypassExpectedUserId() {
  return String(process.env.DEV_CHECKOUT_BYPASS_USER_ID ?? '').trim();
}
