/**
 * Preloaded via `npm test` (`--import ./test/setupTestEnv.mjs`) before any test file.
 * Loads `server/.env` first (same order as bootstrap) so the first `import('../src/db.js')`
 * sees `DATABASE_URL` and a forced test pool cap — avoids Prisma init before dotenv in early files.
 *
 * If you see `FATAL: sorry, too many clients already` on the **first** DB test, Postgres has no
 * free slots — often because `node start.js` / the worker / Prisma Studio use the same DATABASE_URL.
 * Stop those or use a dedicated TEST_DATABASE_URL for integration runs.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after } from 'node:test';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
dotenv.config({ path: join(serverRoot, '.env'), quiet: true });
if (existsSync(join(serverRoot, '.env.local'))) {
  dotenv.config({ path: join(serverRoot, '.env.local'), override: true, quiet: true });
}

/**
 * Always `test` for `npm test`, even when server/.env sets NODE_ENV=development.
 * Otherwise checkout email gate + other NODE_ENV-sensitive middleware drift vs integration tests.
 */
process.env.NODE_ENV = 'test';
if (!String(process.env.PRISMA_CONNECTION_LIMIT ?? '').trim()) {
  process.env.PRISMA_CONNECTION_LIMIT = '3';
}

/**
 * `ci.yml` sets `PRELAUNCH_LOCKDOWN=true` so post-test release gates (`preflight:production`, etc.) see
 * a lockdown production profile. The **unit** suite mounts `createApp()` and expects money-path routes
 * (e.g. `POST /api/checkout-pricing-quote`) to return contract HTTP statuses — not **503** from
 * `prelaunchMoneyBlock`. Integration preload already clears lockdown unless opted in; match that here.
 * Subprocess/isolated tests that require lockdown set env before importing app or spawn children with it.
 */
if (process.env.ZW_UNIT_TEST_RESPECT_PRELAUNCH !== 'true') {
  process.env.PRELAUNCH_LOCKDOWN = 'false';
}
if (process.env.ZW_UNIT_TEST_RESPECT_PAYMENTS_LOCKDOWN !== 'true') {
  process.env.PAYMENTS_LOCKDOWN_MODE = 'false';
}

/**
 * Unit tests hit `/webhooks/stripe` with signed payloads. CI may omit keys; local `.env.local`
 * may override with an empty token, a non-whsec placeholder, or a too-short `whsec_` string.
 * In `NODE_ENV=test` only, normalize to a fixed synthetic signing secret when the effective value
 * is not usable — same verification semantics as a real whsec (Stripe SDK); never written to disk.
 */
const SYNTHETIC_STRIPE_WEBHOOK_SECRET_FOR_UNIT_TESTS =
  'whsec_test_synthetic_signature_rejection_secret_123456';

function stripeWebhookSecretIsUsableForUnitTests(raw) {
  const s = String(raw ?? '').trim();
  if (!s.startsWith('whsec_')) return false;
  // Align with bootstrap: real CLI secrets are longer; short values are placeholders / typos.
  if (s.length < 20) return false;
  return true;
}

if (!stripeWebhookSecretIsUsableForUnitTests(process.env.STRIPE_WEBHOOK_SECRET)) {
  process.env.STRIPE_WEBHOOK_SECRET = SYNTHETIC_STRIPE_WEBHOOK_SECRET_FOR_UNIT_TESTS;
}

/**
 * Synthetic secret key only when unset (do not clobber operator Dashboard keys from dotenv).
 */
if (!String(process.env.STRIPE_SECRET_KEY ?? '').trim()) {
  process.env.STRIPE_SECRET_KEY = `rk_test_${'k'.repeat(90)}`;
}

after(async () => {
  try {
    const { resetRedisClientForTests } = await import('../src/services/redisClient.js');
    await resetRedisClientForTests();
  } catch {
    // ignore — teardown must never fail the suite
  }
});
