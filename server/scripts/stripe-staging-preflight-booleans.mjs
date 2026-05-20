#!/usr/bin/env node
/**
 * Prints Stripe/DB preflight booleans only — never secret values.
 * Run: node scripts/stripe-staging-preflight-booleans.mjs
 * Or:  vercel env run -e production -- node scripts/stripe-staging-preflight-booleans.mjs
 */
import {
  effectiveStripeSecretKey,
  getValidatedStripeSecretKey,
} from '../src/config/stripeEnv.js';

const sk = getValidatedStripeSecretKey();
const skPresent = Boolean(sk);
const skTest =
  skPresent &&
  (sk.startsWith('sk_test_') || sk.startsWith('rk_test_'));
const skLive =
  skPresent && (sk.startsWith('sk_live_') || sk.startsWith('rk_live_'));

const wh = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
const whPresent =
  wh.startsWith('whsec_') && wh.length >= 20 && !wh.toLowerCase().includes('replace');

console.log(`STRIPE_SECRET_KEY_PRESENT ${skPresent}`);
console.log(`STRIPE_TEST_MODE_CONFIRMED ${skTest && !skLive}`);
console.log(`STRIPE_WEBHOOK_SECRET_PRESENT ${whPresent}`);

if (skLive && !skTest) {
  console.log('STRIPE_LIVE_KEY_DETECTED true');
  process.exitCode = 2;
}

if (!skPresent) {
  const raw = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
  const rawLooksLive =
    raw.startsWith('sk_live_') || raw.startsWith('rk_live_');
  if (rawLooksLive) {
    console.log('STRIPE_LIVE_KEY_DETECTED true');
    process.exitCode = 2;
  }
}

void effectiveStripeSecretKey;
