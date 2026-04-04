/**
 * Loaded first from server/index.js. Loads `server/.env`, then optional `server/.env.local`
 * (override). All `src/` code should see `process.env` after this runs.
 */
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = dirname(fileURLToPath(import.meta.url));
const loaded = dotenv.config({
  path: join(serverRoot, '.env'),
  /** In development, prefer `server/.env` over inherited shell (stale DATABASE_URL). Production keeps platform env. */
  override: process.env.NODE_ENV !== 'production',
});
if (loaded.error) {
  console.warn('[dotenv]', loaded.error.message);
}
if (existsSync(join(serverRoot, '.env.local'))) {
  dotenv.config({ path: join(serverRoot, '.env.local'), override: true });
}
