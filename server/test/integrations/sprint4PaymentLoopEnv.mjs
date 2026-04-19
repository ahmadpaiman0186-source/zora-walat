/**
 * Sprint 4 payment-loop integration tests: deterministic Stripe webhook signing + no live Stripe API.
 * Import as the first side-effect in `sprint4PaymentLoopProof.integration.test.js`.
 * Run with: `node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test …`
 *
 * Mirrors `registerChaosWebhookEnv.mjs` (synthetic whsec + sk_test + mock fulfillment).
 */
process.env.STRIPE_WEBHOOK_SECRET = `whsec_${'a'.repeat(32)}`;
process.env.STRIPE_SECRET_KEY = `sk_test_${'b'.repeat(100)}`;
process.env.AIRTIME_PROVIDER = 'mock';
process.env.WEBTOPUP_FULFILLMENT_PROVIDER = 'mock';
process.env.FULFILLMENT_QUEUE_ENABLED = 'false';
process.env.WEBTOPUP_FULFILLMENT_ASYNC = 'false';
