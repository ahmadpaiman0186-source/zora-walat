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

  if (effective) {
    process.env.DATABASE_URL = effective;
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
