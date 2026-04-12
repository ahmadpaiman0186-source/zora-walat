/**
 * Preload with: `node --import ./test/integrations/registerChaosWebhookEnv.mjs --test …`
 * Used only by `stripeWebhookHttpChaos.integration.test.js`.
 *
 * After `preloadTestDatabaseUrl.mjs`, `server/.env` may define real `STRIPE_SECRET_KEY` and
 * Reloadly-oriented providers. Those break this suite: payloads use synthetic `pi_*` / `cs_*`
 * IDs (fee capture must not hit the real Stripe API), and fulfillment must be mock-driven
 * like other Phase 1 integration tests. So this preload always overrides the following.
 */
const testDb = String(process.env.TEST_DATABASE_URL ?? '').trim();
if (testDb) {
  process.env.DATABASE_URL = testDb;
}

process.env.STRIPE_WEBHOOK_SECRET = `whsec_${'a'.repeat(32)}`;
process.env.STRIPE_SECRET_KEY = `sk_test_${'b'.repeat(100)}`;
process.env.AIRTIME_PROVIDER = 'mock';
process.env.WEBTOPUP_FULFILLMENT_PROVIDER = 'mock';
/** Local .env often enables BullMQ; chaos tests expect inline fulfillment + DB attempts without a worker. */
process.env.FULFILLMENT_QUEUE_ENABLED = 'false';
