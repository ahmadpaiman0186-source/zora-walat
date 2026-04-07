/**
 * Preload with: `node --import ./test/integrations/registerChaosWebhookEnv.mjs --test …`
 * Ensures Stripe + DB env exist before `src/config/env.js` loads (webhook signing + SDK).
 */
const testDb = String(process.env.TEST_DATABASE_URL ?? '').trim();
if (testDb) {
  process.env.DATABASE_URL = testDb;
}

if (!String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()) {
  process.env.STRIPE_WEBHOOK_SECRET = `whsec_${'a'.repeat(32)}`;
}

if (!String(process.env.STRIPE_SECRET_KEY ?? '').trim()) {
  process.env.STRIPE_SECRET_KEY = `sk_test_${'b'.repeat(100)}`;
}

if (!String(process.env.AIRTIME_PROVIDER ?? '').trim()) {
  process.env.AIRTIME_PROVIDER = 'mock';
}
