/**
 * Runtime (per-request) evaluation for local-only controlled Stripe live-proof bypass.
 *
 * Reads fresh `process.env` on each validation (no secrets logged). Boolean flags accept only
 * strings that trim + lowercase to exactly `true` (so CRLF / odd casing on `true` still works;
 * `yes` / `1` / `enabled` are rejected).
 */

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function envStrictTrue(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

/**
 * @returns {string}
 */
export function currentNodeEnvLabel() {
  return String(process.env.NODE_ENV ?? '').trim() || 'development';
}

/**
 * Local development only: both flags must normalize to `true`; never in production or test.
 *
 * @returns {boolean}
 */
export function isLocalControlledStripeLiveProofBypassActive() {
  const ne = currentNodeEnvLabel();
  if (ne === 'production' || ne === 'test') return false;
  return (
    envStrictTrue(process.env.ALLOW_UNVERIFIED_CHECKOUT) &&
    envStrictTrue(process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE)
  );
}
