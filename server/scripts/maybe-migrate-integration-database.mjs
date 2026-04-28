/**
 * Optional integration DB migration step for local dev + CI.
 *
 * - In CI (CI=true) or when explicitly forced (ZW_FORCE_INTEGRATION_MIGRATE=true),
 *   run `scripts/migrate-integration-database.mjs`.
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
  String(process.env.ZW_FORCE_INTEGRATION_MIGRATE ?? '').toLowerCase() === 'true';

if (!shouldMigrate) {
  console.error(
    '[maybe-migrate-integration-database] Skipping prisma migrate deploy (set CI=true or ZW_FORCE_INTEGRATION_MIGRATE=true to enable).',
  );
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, 'migrate-integration-database.mjs');
const r = spawnSync(process.execPath, [target], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);

