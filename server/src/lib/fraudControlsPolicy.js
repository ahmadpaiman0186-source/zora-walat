import { env } from '../config/env.js';

/**
 * When true, hosted checkout returns HTTP 429 for distributed abuse `severity===high` even if there is
 * no in-flight `PaymentCheckout` row yet. Production and automated tests default to strict; local
 * `development` stays lenient so repeated session creation during UI work is not blocked.
 *
 * - `CHECKOUT_ABUSE_RELAX_DEV=true` — force lenient (high severity logs only unless rapid pending rule hits).
 * - `CHECKOUT_ABUSE_STRICT=true` — force strict in any `NODE_ENV` (e.g. hardened staging).
 */
export function checkoutAbuseBlockHighSeverityImmediately() {
  if (process.env.CHECKOUT_ABUSE_RELAX_DEV === 'true') {
    return false;
  }
  if (process.env.CHECKOUT_ABUSE_STRICT === 'true') {
    return true;
  }
  return env.nodeEnv === 'production' || env.nodeEnv === 'test';
}
