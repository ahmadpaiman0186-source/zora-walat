import Stripe from 'stripe';

import { env } from '../config/env.js';
import { getValidatedStripeSecretKey } from '../config/stripeEnv.js';

let stripeSingleton = null;
let stripeSingletonForKey = null;

/**
 * Single Stripe client for the process. Returns null if key is not configured.
 * Key is read at call time (after `server/bootstrap.js` loads `server/.env`).
 */
export function getStripeClient() {
  const key = getValidatedStripeSecretKey();
  if (!key) return null;
  if (stripeSingleton && stripeSingletonForKey === key) {
    return stripeSingleton;
  }
  stripeSingleton = new Stripe(key, {
    /** Prevent unbounded hangs on Stripe HTTP (client timeout; orchestrator adds bounded retries). */
    timeout: 25_000,
    /** Reliability retries live in `orchestrateStripeCall` — avoid double-retry stacks. */
    maxNetworkRetries: 0,
  });
  stripeSingletonForKey = key;
  return stripeSingleton;
}

/**
 * Safe log line — fixed tokens only (`Stripe: OK` | `Stripe: configured` | `Stripe: NOT CONFIGURED`).
 * Never prints key length, prefix, suffix, or path.
 */
export function stripeKeyStatusLog() {
  const key = getValidatedStripeSecretKey();

  if (!key) {
    return 'Stripe: NOT CONFIGURED';
  }

  if (env.nodeEnv === 'production') {
    return 'Stripe: configured';
  }

  return 'Stripe: OK';
}
