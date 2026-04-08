/**
 * Runs `prisma migrate deploy` against the **same** PostgreSQL URL integration tests use:
 * `TEST_DATABASE_URL` if set (non-empty), else `DATABASE_URL` from `server/.env` + `server/.env.local`.
 *
 * Does NOT import bootstrap.js: `bootstrap` uses dotenv override in development and would replace
 * an explicitly chosen URL with `.env`'s DATABASE_URL when spawning prisma-cli elsewhere.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveIntegrationMigrateUrl } from '../test/integrations/testDatabaseResolution.mjs';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const { effectiveUrl, source, display } = resolveIntegrationMigrateUrl();

if (!effectiveUrl) {
  console.error(
    '[migrate-integration-database] No DATABASE_URL in server/.env (and no TEST_DATABASE_URL). Set one, then retry.',
  );
  process.exit(1);
}

console.error(
  `[migrate-integration-database] prisma migrate deploy → ${source} (${display})`,
);

const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
if (!fs.existsSync(prismaCli)) {
  console.error('[migrate-integration-database] Prisma CLI not found. Run npm install in server/.');
  process.exit(1);
}

const r = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: effectiveUrl },
});

process.exit(r.status === null ? 1 : r.status);
