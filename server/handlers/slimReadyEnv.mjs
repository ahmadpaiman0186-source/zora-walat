/**
 * Dotenv priming for serverless slim `/ready` only when not in production.
 * Mirrors `bootstrap.js` `.env` / `.env.local` loading without importing bootstrap
 * (bootstrap awaits Redis rate-limit init).
 */
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export function primeSlimServerlessEnv() {
  if (process.env.NODE_ENV === 'production') return;

  const dotenvQuiet =
    String(process.env.FORTRESS_PROBE_QUIET ?? '')
      .trim()
      .toLowerCase() === 'true';
  const dotenvQuietDev =
    process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  const loaded = dotenv.config({
    path: join(serverRoot, '.env'),
    override: process.env.NODE_ENV !== 'production',
    quiet: dotenvQuiet || dotenvQuietDev,
  });
  if (loaded.error) {
    console.warn('[dotenv]', loaded.error.message);
  }
  if (existsSync(join(serverRoot, '.env.local'))) {
    dotenv.config({
      path: join(serverRoot, '.env.local'),
      override: true,
      quiet: dotenvQuiet || dotenvQuietDev,
    });
  }
}
