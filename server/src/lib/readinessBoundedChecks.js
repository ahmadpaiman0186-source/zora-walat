/**
 * Bounded-time readiness probes for serverless: never block /ready on hung Postgres/Redis.
 * Does not replace startup security gates in serverLifecycle (JWT, CORS, etc.).
 */

/** Max length for `error.name` copied into slim-ready diagnostic logs (no message/stack). */
export const SLIM_READY_DB_ERROR_NAME_MAX_LEN = 120;

/** @typedef {'select_1' | 'webtopup_findfirst'} SlimReadyDbProbeStep */

/**
 * Safe fields only for slim /ready DB failure diagnostics (no message, stack, env, URLs).
 * @param {unknown} err
 * @returns {{
 *   errorName: string;
 *   prismaCode: string;
 *   safeCategory:
 *     | 'prisma_auth'
 *     | 'prisma_connectivity'
 *     | 'prisma_connection_closed'
 *     | 'prisma_schema'
 *     | 'prisma_unknown'
 *     | 'unknown_db_error';
 * }}
 */
export function classifySlimReadyDbProbeFailure(err) {
  const rawName = err?.name;
  const errorName =
    typeof rawName === 'string' &&
    rawName.length > 0 &&
    rawName.length <= SLIM_READY_DB_ERROR_NAME_MAX_LEN
      ? rawName
      : 'unknown';

  const rawCode = err?.code;
  const prismaCode =
    typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode) ? rawCode : '';

  let safeCategory = /** @type {ReturnType<typeof classifySlimReadyDbProbeFailure>['safeCategory']} */ (
    'unknown_db_error'
  );
  if (prismaCode === 'P1000') {
    safeCategory = 'prisma_auth';
  } else if (prismaCode === 'P1001' || prismaCode === 'P1008') {
    safeCategory = 'prisma_connectivity';
  } else if (prismaCode === 'P1017') {
    safeCategory = 'prisma_connection_closed';
  } else if (prismaCode === 'P2021' || prismaCode === 'P2022') {
    safeCategory = 'prisma_schema';
  } else if (
    !prismaCode &&
    typeof rawName === 'string' &&
    rawName.includes('Prisma')
  ) {
    safeCategory = 'prisma_unknown';
  }

  return { errorName, prismaCode, safeCategory };
}

/**
 * @param {SlimReadyDbProbeStep} probeStep
 * @param {unknown} err
 */
function logSlimReadyDbProbeFailure(probeStep, err) {
  const { errorName, prismaCode, safeCategory } = classifySlimReadyDbProbeFailure(err);
  console.warn('[slim-ready-db-error]', {
    probeStep,
    errorName,
    prismaCode,
    safeCategory,
  });
}

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
 * @param {{
 *   dbProbeMs?: number;
 *   logSlimReadyDbError?: boolean;
 * }} [opts] test-only shorter budgets; `logSlimReadyDbError` logs one safe line on db_error (slim /ready only).
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
  const logSlim = Boolean(opts.logSlimReadyDbError);
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
    if (logSlim) {
      logSlimReadyDbProbeFailure('select_1', e);
    }
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
    if (logSlim) {
      logSlimReadyDbProbeFailure('webtopup_findfirst', e);
    }
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
