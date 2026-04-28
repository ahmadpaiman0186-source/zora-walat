/**
 * Single source of truth for which PostgreSQL URL integration tests use.
 * `TEST_DATABASE_URL` (if non-empty) replaces `DATABASE_URL` for the test process — must be fully migrated.
 */
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Redacted-ish display: host:port/database (no credentials). */
export function describePostgresUrlDisplay(url) {
  const s = String(url ?? '').trim();
  if (!s) return '(empty)';
  try {
    const u = new URL(s);
    const db = (u.pathname || '').replace(/^\//, '').split('?')[0] || '(no db)';
    const port = u.port || '5432';
    return `${u.hostname}:${port}/${db}`;
  } catch {
    return '(unparseable url)';
  }
}

/**
 * Loads `server/.env` then `server/.env.local` (override) — mirrors bootstrap order for local dev.
 */
export function loadServerDotenv() {
  const serverRoot = resolve(__dirname, '../..');
  dotenv.config({ path: resolve(serverRoot, '.env') });
  const local = resolve(serverRoot, '.env.local');
  if (existsSync(local)) {
    dotenv.config({ path: local, override: true });
  }
  return serverRoot;
}

/**
 * Sets `process.env.DATABASE_URL` to the integration effective URL and diagnostic env vars.
 * @returns {{ effectiveUrl: string | null, source: 'TEST_DATABASE_URL' | 'DATABASE_URL' | 'none', display: string }}
 */
export function applyIntegrationTestDatabaseEnv() {
  loadServerDotenv();

  const testUrl = String(process.env.TEST_DATABASE_URL ?? '').trim();
  const baseUrl = String(process.env.DATABASE_URL ?? '').trim();
  const source =
    testUrl ? 'TEST_DATABASE_URL' : baseUrl ? 'DATABASE_URL' : 'none';
  const effective = testUrl || baseUrl || null;

  /**
   * Cap Prisma pool size for integration runs so multiple suites + a dev API on the same Postgres
   * are less likely to hit `FATAL: sorry, too many clients already`.
   * Always sets `connection_limit` on the URL (overrides an existing value from `.env`).
   */
  const integrationPoolLimit = String(
    process.env.ZW_INTEGRATION_PRISMA_POOL ?? process.env.PRISMA_CONNECTION_LIMIT ?? '3',
  ).trim() || '3';

  /** Same query-string rule as `src/db.js` (avoid importing db before `DATABASE_URL` is set). */
  function applyConnectionLimitToUrl(url, limit) {
    const s = String(url ?? '').trim();
    if (!s) return s;
    const qIndex = s.indexOf('?');
    const lim = String(limit);
    if (qIndex === -1) {
      return `${s}?connection_limit=${encodeURIComponent(lim)}`;
    }
    const base = s.slice(0, qIndex);
    const qs = s.slice(qIndex + 1);
    const params = new URLSearchParams(qs);
    params.set('connection_limit', lim);
    return `${base}?${params.toString()}`;
  }

  if (effective) {
    process.env.DATABASE_URL = applyConnectionLimitToUrl(effective, integrationPoolLimit);
    if (!String(process.env.PRISMA_CONNECTION_LIMIT ?? '').trim()) {
      process.env.PRISMA_CONNECTION_LIMIT = integrationPoolLimit;
    }
  }

  /**
   * Local `server/.env` may set `PRELAUNCH_LOCKDOWN=true` for operator staging.
   * Integration suites expect normal money + registration + `/ready` unless they opt into lockdown.
   * Set `ZW_INTEGRATION_RESPECT_PRELAUNCH=true` to keep `.env` prelaunch behavior in a test process.
   */
  if (process.env.ZW_INTEGRATION_RESPECT_PRELAUNCH !== 'true') {
    process.env.PRELAUNCH_LOCKDOWN = 'false';
  }

  /**
   * Operator `.env` may enable `PAYMENTS_LOCKDOWN_MODE=true`, which yields **503** before route-level
   * auth/session guards (false negatives vs expected **403** contract tests).
   * CI/GHA typically does not set this; dotenv overrides must not silently enable lockdown for integration.
   * Set `ZW_INTEGRATION_RESPECT_PAYMENTS_LOCKDOWN=true` to exercise lockdown in-process.
   */
  if (process.env.ZW_INTEGRATION_RESPECT_PAYMENTS_LOCKDOWN !== 'true') {
    process.env.PAYMENTS_LOCKDOWN_MODE = 'false';
  }

  /**
   * Integration suites use synthetic emails unless testing owner-only mode.
   * Set `ZW_INTEGRATION_RESPECT_OWNER_ONLY=true` and `OWNER_ALLOWED_EMAIL` to exercise allow/deny.
   */
  if (process.env.ZW_INTEGRATION_RESPECT_OWNER_ONLY !== 'true') {
    process.env.OWNER_ALLOWED_EMAIL = '';
  }

  /**
   * GitHub Actions `ci.yml` sets `CLIENT_URL` for Stripe checkout `return_url` / `cancel_url` resolution.
   * If `server/.env` omits it, unverified-user checkout tests can return **400** (unresolved client base)
   * before `requireEmailVerified` can return **403** — false negative. Default to the same dev base as CI.
   * Set `ZW_INTEGRATION_RESPECT_CLIENT_URL=true` to keep an empty `CLIENT_URL` for a specific test file.
   */
  if (
    process.env.ZW_INTEGRATION_RESPECT_CLIENT_URL !== 'true' &&
    !String(process.env.CLIENT_URL ?? '').trim()
  ) {
    process.env.CLIENT_URL = 'http://127.0.0.1:3000';
  }

  /**
   * Match `test/setupTestEnv.mjs`: after dotenv, `server/.env` may set `NODE_ENV=development`.
   * `env.allowUnverifiedCheckoutInDev` would then skip `requireEmailVerified` on hosted checkout,
   * causing false negatives in `verifiedMoneyPath` (200 vs expected 403). Integration preload runs
   * before `createApp` imports `env.js`.
   * Set `ZW_INTEGRATION_RESPECT_NODE_ENV=true` to preserve `.env` NODE_ENV for a dedicated run.
   */
  if (process.env.ZW_INTEGRATION_RESPECT_NODE_ENV !== 'true') {
    process.env.NODE_ENV = 'test';
  }

  process.env.ZW_INTEGRATION_TEST_DB_SOURCE = source;
  process.env.ZW_INTEGRATION_TEST_DB_DISPLAY = effective
    ? describePostgresUrlDisplay(effective)
    : '(none)';

  if (
    effective &&
    process.env.ZW_INTEGRATION_DB_LOG !== '0' &&
    process.env.ZW_INTEGRATION_DB_LOG !== 'false'
  ) {
    console.error(
      `[zw-integration] Effective DB: ${source} → ${process.env.ZW_INTEGRATION_TEST_DB_DISPLAY}`,
    );
  }

  return {
    effectiveUrl: effective,
    source,
    display: effective ? describePostgresUrlDisplay(effective) : '(none)',
  };
}

/**
 * URL used for `npm run db:migrate:integration` (same rule as integration preload).
 */
export function resolveIntegrationMigrateUrl() {
  loadServerDotenv();
  const testUrl = String(process.env.TEST_DATABASE_URL ?? '').trim();
  const baseUrl = String(process.env.DATABASE_URL ?? '').trim();
  const source = testUrl ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
  const effective = testUrl || baseUrl || null;
  return {
    effectiveUrl: effective,
    source: effective ? source : 'none',
    display: effective ? describePostgresUrlDisplay(effective) : '(none)',
  };
}
