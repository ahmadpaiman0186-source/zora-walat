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
