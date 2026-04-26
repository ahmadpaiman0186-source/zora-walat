import './config/env.js';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Replace or append `connection_limit` using only query-string parsing (host/path may contain
 * odd characters that break `new URL()` for some operator URLs).
 */
function applyConnectionLimitQueryParam(urlString, limit) {
  const s = String(urlString).trim();
  const qIndex = s.indexOf('?');
  if (qIndex === -1) {
    return `${s}?connection_limit=${encodeURIComponent(limit)}`;
  }
  const base = s.slice(0, qIndex);
  const qs = s.slice(qIndex + 1);
  const params = new URLSearchParams(qs);
  params.set('connection_limit', limit);
  return `${base}?${params.toString()}`;
}

/**
 * Apply `connection_limit` on the Prisma pool from `PRISMA_CONNECTION_LIMIT` and `DATABASE_URL`.
 * - Non-test: append limit only when `PRISMA_CONNECTION_LIMIT` is set; if URL already has
 *   `connection_limit`, leave it unchanged.
 * - `npm test` / `NODE_ENV=test`: **always** set `connection_limit` (default **3**) so `.env`
 *   cannot widen the pool.
 */
function buildDatabaseUrlWithPoolCap() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  const isTest =
    process.env.npm_lifecycle_event === 'test' || process.env.NODE_ENV === 'test';

  let limit = process.env.PRISMA_CONNECTION_LIMIT?.trim();
  if (isTest) {
    if (!limit) limit = '3';
    return applyConnectionLimitQueryParam(String(raw).trim(), limit);
  }

  let url = String(raw).trim();
  if (url.includes('connection_limit=')) return url;
  if (!limit) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=${encodeURIComponent(limit)}`;
}

const effectiveDatabaseUrl = buildDatabaseUrlWithPoolCap();

export const prisma = effectiveDatabaseUrl
  ? new PrismaClient({
      datasources: {
        db: { url: effectiveDatabaseUrl },
      },
    })
  : new PrismaClient();

if (typeof globalThis !== 'undefined') {
  if (globalThis.__ZW_PRISMA_CLIENT__ && globalThis.__ZW_PRISMA_CLIENT__ !== prisma) {
    console.warn('[db] Multiple PrismaClient instances detected — import only from src/db.js');
  }
  globalThis.__ZW_PRISMA_CLIENT__ = prisma;
}

// Prisma merges server/.env on first client load; tests that pin ADMIN_* should set secrets after importing app.js.

export { Prisma };
