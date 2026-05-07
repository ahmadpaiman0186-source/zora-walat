/**
 * Optional integration DB migration step for local dev + CI.
 *
 * - In CI (CI=true), when explicitly forced (ZW_FORCE_INTEGRATION_MIGRATE=true), or when
 *   invoked from `npm run test:ci` (npm_lifecycle_event=test:ci), run
 *   `scripts/migrate-integration-database.mjs`.
 * - Otherwise, skip to avoid destructive/interactive local DB baselining issues.
 *
 * Rationale: `prisma migrate deploy` fails with P3005 when pointed at a non-empty DB that
 * was not created via Prisma Migrate. CI databases should be empty/fresh and safe to migrate.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shouldMigrate =
  String(process.env.CI ?? '').toLowerCase() === 'true' ||
  String(process.env.ZW_FORCE_INTEGRATION_MIGRATE ?? '').toLowerCase() === 'true' ||
  // `npm run test:ci` runs this script as a child; npm sets `npm_lifecycle_event` for the lifecycle.
  // Apply pending migrations so integration tests match trigger functions (e.g. ledger immutability + harness bypass).
  String(process.env.npm_lifecycle_event ?? '') === 'test:ci';

if (!shouldMigrate) {
  console.error(
    '[maybe-migrate-integration-database] Skipping prisma migrate deploy (set CI=true, ZW_FORCE_INTEGRATION_MIGRATE=true, or run via `npm run test:ci` to enable).',
  );
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, 'migrate-integration-database.mjs');
const r = spawnSync(process.execPath, [target], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);

