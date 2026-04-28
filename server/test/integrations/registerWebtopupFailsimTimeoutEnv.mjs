/**
 * Preload: mock provider + simulated retryable failure (WEBTOPUP_FAILSIM=timeout).
 * Used by `webTopupFulfillmentFailure.integration.test.js`.
 */
const testDb = String(process.env.TEST_DATABASE_URL ?? '').trim();
if (testDb) {
  process.env.DATABASE_URL = testDb;
}

process.env.WEBTOPUP_FAILSIM = 'timeout';
process.env.WEBTOPUP_FULFILLMENT_PROVIDER = 'mock';
process.env.FULFILLMENT_QUEUE_ENABLED = 'false';
process.env.WEBTOPUP_FULFILLMENT_ASYNC = 'false';
