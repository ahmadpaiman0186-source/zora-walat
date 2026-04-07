/**
 * Integration tests use `TEST_DATABASE_URL`; services use `src/db.js` → `DATABASE_URL`.
 * Preload this file so both see the same database:
 *
 *   node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test ...
 */
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const t = String(process.env.TEST_DATABASE_URL ?? '').trim();
if (t) {
  process.env.DATABASE_URL = t;
}
