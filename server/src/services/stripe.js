import Stripe from 'stripe';

import { env } from '../config/env.js';
import { getValidatedStripeSecretKey } from '../config/stripeEnv.js';

let stripeSingleton = null;
let stripeSingletonForKey = null;

/** @type {import('stripe').Stripe | Record<string, unknown> | null} */
let stripeClientOverrideForTests = null;

function nodeEnvNormalized() {
  return String(process.env.NODE_ENV ?? '').trim();
}

function isStripeClientTestOverrideAllowed() {
  if (nodeEnvNormalized() === 'production') {
    return false;
  }
  return (
    nodeEnvNormalized() === 'test' ||
    process.env.npm_lifecycle_event === 'test'
  );
}

/**
 * Inject a fake Stripe client for HTTP/unit tests (e.g. dispute `charges.retrieve` paths).
 * Throws outside an explicit test runtime; **never** allowed when NODE_ENV=production.
 *
 * @param {import('stripe').Stripe | Record<string, unknown> | null} client
 */
export function setStripeClientOverrideForTests(client) {
  if (nodeEnvNormalized() === 'production') {
    throw new Error('setStripeClientOverrideForTests: forbidden when NODE_ENV=production');
  }
  if (!isStripeClientTestOverrideAllowed()) {
    throw new Error('setStripeClientOverrideForTests: test runtime only');
  }
  stripeClientOverrideForTests = client;
}

export function clearStripeClientOverrideForTests() {
  stripeClientOverrideForTests = null;
}

/**
 * Single Stripe client for the process. Returns null if key is not configured.
 * Key is read at call time (after `server/bootstrap.js` loads `server/.env`).
 */
export function getStripeClient() {
  if (stripeClientOverrideForTests != null && isStripeClientTestOverrideAllowed()) {
    return /** @type {import('stripe').Stripe} */ (stripeClientOverrideForTests);
  }
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
