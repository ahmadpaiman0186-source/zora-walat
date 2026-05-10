/**
 * Bounded-time readiness probes for serverless: never block /ready on hung Postgres/Redis.
 * Does not replace startup security gates in serverLifecycle (JWT, CORS, etc.).
 */

/** Primary DB liveness + WebTopupOrder table probe (ms). */
export const READINESS_DB_PROBE_MS = 2200;

/** Extended DB snapshots (stuck summary, counts, groupBy) — each operation capped (ms). */
export const READINESS_DB_EXTENDED_MS = 2200;

/** BullMQ / Redis queue observation (ms). */
export const READINESS_QUEUE_PROBE_MS = 1200;

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} reasonCode
 * @returns {Promise<T>}
 */
export function raceReadinessOperation(promise, ms, reasonCode) {
  if (!(ms > 0)) return promise;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(reasonCode);
      err.code = reasonCode;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Core DB checks for /ready: SELECT 1 + WebTopupOrder findFirst.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ dbProbeMs?: number }} [opts] test-only shorter budgets
 * @returns {Promise<
 *   | { ok: true; checks: { database: string; webTopupPersistence: string } }
 *   | {
 *       ok: false;
 *       checks: Record<string, string>;
 *       readinessReason: 'db_timeout' | 'db_error';
 *     }
 * >}
 */
export async function runReadinessDatabaseCore(prisma, opts = {}) {
  const dbMs = opts.dbProbeMs ?? READINESS_DB_PROBE_MS;
  const checks = /** @type {Record<string, string>} */ ({});
  try {
    await raceReadinessOperation(
      prisma.$queryRaw`SELECT 1`,
      dbMs,
      'db_timeout',
    );
    checks.database = 'ok';
  } catch (e) {
    const code = e?.code ?? e?.message;
    if (code === 'db_timeout') {
      checks.database = 'db_timeout';
      checks.webTopupPersistence = 'skipped';
      return { ok: false, checks, readinessReason: 'db_timeout' };
    }
    checks.database = 'failed';
    checks.webTopupPersistence = 'skipped';
    return { ok: false, checks, readinessReason: 'db_error' };
  }
  try {
    await raceReadinessOperation(
      prisma.webTopupOrder.findFirst({ select: { id: true } }),
      dbMs,
      'db_timeout',
    );
    checks.webTopupPersistence = 'ok';
  } catch (e) {
    const code = e?.code ?? e?.message;
    if (code === 'db_timeout') {
      checks.webTopupPersistence = 'db_timeout';
      return { ok: false, checks, readinessReason: 'db_timeout' };
    }
    checks.webTopupPersistence = 'failed';
    return { ok: false, checks, readinessReason: 'db_error' };
  }
  return {
    ok: true,
    checks: {
      database: checks.database,
      webTopupPersistence: checks.webTopupPersistence,
    },
  };
}
