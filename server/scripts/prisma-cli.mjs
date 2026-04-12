/**
 * Runs Prisma CLI with the same env as the API process (loads server/bootstrap.js first).
 * Avoids stale shell DATABASE_URL overriding server/.env during migrate/validate on Windows.
 *
 * Usage: node scripts/prisma-cli.mjs migrate deploy
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Avoid Stripe webhook operator noise during schema-only tooling (`npm run db:validate`, etc.). */
process.env.ZW_PRISMA_CLI = '1';
await import(pathToFileURL(path.join(serverRoot, 'bootstrap.js')).href);

const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
if (!fs.existsSync(prismaCli)) {
  console.error('[prisma-cli] Prisma CLI not found. Run npm install in server/.');
  process.exit(1);
}

const passArgs = process.argv.slice(2);
if (passArgs.length === 0) {
  console.error(
    'Usage: node scripts/prisma-cli.mjs <args…>  e.g. migrate deploy | validate | studio',
  );
  process.exit(1);
}

const r = spawnSync(process.execPath, [prismaCli, ...passArgs], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(r.status === null ? 1 : r.status);
