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
  stripeSingleton = new Stripe(key);
  stripeSingletonForKey = key;
  return stripeSingleton;
}

/** Safe log line — never prints key material; production omits length/prefix hints. */
export function stripeKeyStatusLog() {
  const key = getValidatedStripeSecretKey();
  if (!key) {
    if (env.nodeEnv === 'production') {
      return 'Stripe: NOT CONFIGURED';
    }
    return 'Stripe: NOT CONFIGURED (set STRIPE_SECRET_KEY in server/.env or server/stripe_secret.key — Restricted keys: rk_test_/rk_live_)';
  }
  if (env.nodeEnv === 'production') {
    return 'Stripe: configured';
  }
  return `Stripe: OK (length=${key.length}, prefix=${key.slice(0, 12)}…)`;
}
