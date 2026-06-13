import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';

/** Outer wall-clock budget for slim serverless `/ready` (imports + DB core probe). */
export const SLIM_READY_DEADLINE_MS = 5000;

/**
 * @param {number} ms
 * @param {string} code
 */
function rejectAfter(ms, code) {
  return new Promise((_, rej) => {
    setTimeout(() => {
      const e = new Error(code);
      e.code = code;
      rej(e);
    }, ms);
  });
}

/**
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {{ status: string; readinessReason: string }} fields
 * @param {number} timeoutMs
 */
function sendSlimReadyJson(res, statusCode, fields, timeoutMs) {
  res.status(statusCode).json({
    status: fields.status,
    readinessReason: fields.readinessReason,
    checkedAt: new Date().toISOString(),
    timeoutMs,
  });
}

/**
 * Vercel serverless fast `/ready`: bounded DB core probe only (no Express/bootstrap).
 * Never attaches errors, stacks, or env-backed strings to the JSON body.
 *
 * @param {import('express').Response} res
 * @param {{ deadlineMs?: number, runProbe?: () => Promise<unknown> }} [options]
 */
export async function handleSlimReady(res, options = {}) {
  const deadlineMs =
    typeof options.deadlineMs === 'number' && options.deadlineMs > 0
      ? options.deadlineMs
      : SLIM_READY_DEADLINE_MS;

  res.setHeader('Cache-Control', 'no-store');

  const runProbe =
    options.runProbe ??
    (async () => {
      primeSlimServerlessEnv();
      const { prisma } = await import('../src/db.js');
      const { runReadinessDatabaseCore } = await import(
        '../src/lib/readinessBoundedChecks.js'
      );
      return runReadinessDatabaseCore(prisma, { logSlimReadyDbError: true });
    });

  try {
    const core = await Promise.race([
      runProbe(),
      rejectAfter(deadlineMs, 'slim_ready_deadline'),
    ]);

    if (core.ok) {
      sendSlimReadyJson(
        res,
        200,
        { status: 'ready', readinessReason: 'database_ok' },
        deadlineMs,
      );
      return;
    }

    const reason = core.readinessReason ?? 'database_not_ready';
    sendSlimReadyJson(
      res,
      503,
      { status: 'unavailable', readinessReason: reason },
      deadlineMs,
    );
  } catch (e) {
    const code = e?.code ?? e?.message;
    const reason =
      code === 'slim_ready_deadline'
        ? 'slim_ready_deadline'
        : 'slim_ready_error';
    sendSlimReadyJson(
      res,
      503,
      {
        status: 'unavailable',
        readinessReason: reason,
      },
      deadlineMs,
    );
  }
}
