/**
 * Slim authenticated GET /ops/db-readonly-proof — no full app cold start.
 * Uses READ_ONLY_DATABASE_URL via executeDbReadonlyProof only (never owner DATABASE_URL).
 */
import { dbReadonlyProofInvariants } from '../src/lib/dbReadonlyProofContract.js';

/**
 * @param {string} route
 */
function buildSlimDbReadonlyProofRuntimeExceptionBody(route) {
  return {
    ok: false,
    success: false,
    verdict: 'BLOCKED',
    classification: 'SLIM_DB_READONLY_PROOF_RUNTIME_EXCEPTION',
    reason: 'slim_db_readonly_proof_runtime_exception',
    route,
    auth_required: true,
    prebootstrap_guard: false,
    slim_authenticated_proof: true,
    db_query_performed: false,
    row_export_occurred: false,
    write_probe_occurred: false,
    secret_disclosure: false,
    owner_database_url_fallback_used: false,
    runtime_db_identity_proof: false,
    readonly_database_url_proof: false,
    ...dbReadonlyProofInvariants(),
  };
}

/**
 * @param {import('express').Response} res
 * @param {string} route
 */
function sendSlimDbReadonlyProofRuntimeException(res, route) {
  if (res.headersSent) return;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(503).json(buildSlimDbReadonlyProofRuntimeExceptionBody(route));
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ httpStatus: number, body: Record<string, unknown> }>}
 */
async function defaultExecuteProof(req) {
  if (typeof globalThis.__zwSlimDbReadonlyProofExecuteForTest === 'function') {
    return globalThis.__zwSlimDbReadonlyProofExecuteForTest(req);
  }
  const { executeDbReadonlyProof } = await import('../src/services/dbReadonlyProofService.js');
  return executeDbReadonlyProof(req);
}

/**
 * Authenticated pass-through after pre-bootstrap guard — slim serverless path only.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('express').Response} res
 * @param {{
 *   route?: string;
 *   executeProof?: (req: import('http').IncomingMessage) => Promise<{ httpStatus: number, body: Record<string, unknown> }>;
 * }} [options]
 */
export async function handleSlimDbReadonlyProofAuthenticatedGet(req, res, options = {}) {
  const route =
    typeof options.route === 'string' && options.route.length > 0
      ? options.route
      : '/ops/db-readonly-proof';
  const executeProof = options.executeProof ?? defaultExecuteProof;

  res.setHeader('Cache-Control', 'no-store');

  try {
    const result = await executeProof(req);
    if (res.headersSent) return;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(result.httpStatus).json(result.body);
  } catch {
    sendSlimDbReadonlyProofRuntimeException(res, route);
  }
}
