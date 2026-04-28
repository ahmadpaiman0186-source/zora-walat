/**
 * Fast auto-retry backoff for integration tests (loads before env snapshot).
 */
const testDb = String(process.env.TEST_DATABASE_URL ?? '').trim();
if (testDb) {
  process.env.DATABASE_URL = testDb;
}

process.env.WEBTOPUP_FAILSIM = 'timeout';
process.env.WEBTOPUP_FULFILLMENT_PROVIDER = 'mock';
process.env.FULFILLMENT_QUEUE_ENABLED = 'false';
process.env.WEBTOPUP_FULFILLMENT_ASYNC = 'false';
process.env.WEBTOPUP_AUTO_RETRY_ENABLED = 'true';
process.env.WEBTOPUP_AUTO_RETRY_MAX_DISPATCH_ATTEMPTS = '3';
process.env.WEBTOPUP_AUTO_RETRY_BACKOFF_MS = '50,100,150';
