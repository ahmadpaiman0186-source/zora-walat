/**
 * Prints integration-test preconditions (no DB connection).
 * Usage: npm run test:integration:preflight
 */
import {
  resolveIntegrationMigrateUrl,
  loadServerDotenv,
} from '../test/integrations/testDatabaseResolution.mjs';

loadServerDotenv();

const { effectiveUrl, source, display } = resolveIntegrationMigrateUrl();
const redisUrl = Boolean(String(process.env.REDIS_URL ?? '').trim());
const ci = process.env.CI === 'true';
const stripeWebhookSecret = Boolean(
  String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim(),
);

console.log('=== Zora-Walat — integration test preflight ===\n');
console.log(`Effective PostgreSQL (${source}): ${effectiveUrl ? display : '(none — set DATABASE_URL in server/.env)'}`);
console.log(`REDIS_URL set: ${redisUrl ? 'yes' : 'no'} (some suites / chaos webhook may need Redis)`);
console.log(
  `CI=true: ${ci ? 'yes' : 'no'} (GitHub Actions must set TEST_DATABASE_URL; locally, migrated DATABASE_URL is enough for Phase 1 + webhook integration suites when using preload)`,
);
console.log(
  `STRIPE_WEBHOOK_SECRET set in .env: ${stripeWebhookSecret ? 'yes' : 'no'} (needed for live API + stripe listen; HTTP chaos suite uses its own synthetic secret via registerChaosWebhookEnv.mjs)`,
);
console.log('');

console.log('Suggested next steps:');
if (!effectiveUrl) {
  console.log('  - Set DATABASE_URL (or TEST_DATABASE_URL) in server/.env');
} else {
  console.log('  - npm run db:migrate:integration');
}
console.log('  - npm run verify:wallet-topup-idempotency');
console.log('  - npm run test:integration\n');

process.exit(0);
