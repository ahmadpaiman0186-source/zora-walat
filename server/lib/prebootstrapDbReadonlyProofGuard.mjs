import { timingSafeEqualUtf8 } from '../src/lib/timingSafeString.js';

export const PREBOOTSTRAP_DB_READONLY_PROOF_ROUTES = Object.freeze([
  '/ops/db-readonly-proof',
  '/api/admin/ops/db-readonly-proof',
]);

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
export function requestPresentsOpsToken(req) {
  const auth = req.headers?.authorization;
  const x = req.headers?.['x-zw-ops-token'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    if (auth.slice(7).trim().length > 0) return true;
  }
  if (typeof x === 'string' && x.trim().length > 0) return true;
  return false;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function extractRequestOpsToken(req) {
  const auth = req.headers?.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const x = req.headers?.['x-zw-ops-token'];
  if (typeof x === 'string') return x.trim();
  return '';
}

/**
 * OPS_HEALTH_TOKEN from process.env only — no env.js, no DATABASE_URL.
 * @param {() => string | undefined} [readConfigured]
 */
export function readConfiguredOpsHealthToken(readConfigured) {
  const reader =
    readConfigured ??
    (() =>
      process.env.OPS_HEALTH_TOKEN ?? process.env.OPS_INFRA_HEALTH_TOKEN ?? '');
  return String(reader() ?? '').trim();
}

/**
 * @param {string} route
 * @param {'token_missing' | 'token_invalid' | 'readonly_url_missing'} reason
 */
export function buildPrebootstrapDbReadonlyProofBlockedBody(route, reason) {
  return {
    ok: false,
    verdict: 'BLOCKED',
    reason,
    route,
    auth_required: true,
    prebootstrap_guard: true,
    db_query_performed: false,
    row_export_occurred: false,
    write_probe_occurred: false,
    secret_disclosure: false,
    owner_database_url_fallback_used: false,
    runtime_db_identity_proof: false,
    readonly_database_url_proof: false,
  };
}

/**
 * @param {'token_missing' | 'token_invalid' | 'readonly_url_missing'} reason
 */
export function httpStatusForPrebootstrapBlocked(reason) {
  if (reason === 'readonly_url_missing') return 503;
  return 401;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {string} route
 * @param {{
 *   readConfiguredOpsToken?: () => string | undefined;
 *   hasReadonlyDatabaseUrl?: () => boolean;
 * }} [deps]
 * @returns {{ action: 'blocked', reason: 'token_missing' | 'token_invalid' | 'readonly_url_missing' } | { action: 'pass_through' }}
 */
export function evaluatePrebootstrapDbReadonlyProof(req, route, deps = {}) {
  const configured = readConfiguredOpsHealthToken(deps.readConfiguredOpsToken);
  if (configured.length < 16) {
    return { action: 'blocked', reason: 'token_invalid' };
  }
  if (!requestPresentsOpsToken(req)) {
    return { action: 'blocked', reason: 'token_missing' };
  }
  const presented = extractRequestOpsToken(req);
  if (!timingSafeEqualUtf8(presented, configured)) {
    return { action: 'blocked', reason: 'token_invalid' };
  }
  const hasReadonlyUrl =
    deps.hasReadonlyDatabaseUrl ??
    (() => String(process.env.READ_ONLY_DATABASE_URL ?? '').trim().length > 0);
  if (!hasReadonlyUrl()) {
    return { action: 'blocked', reason: 'readonly_url_missing' };
  }
  return { action: 'pass_through' };
}

/**
 * @param {import('express').Response} res
 * @param {'token_missing' | 'token_invalid' | 'readonly_url_missing'} reason
 * @param {string} route
 */
export function sendPrebootstrapDbReadonlyProofBlocked(res, reason, route) {
  res.setHeader('Cache-Control', 'no-store');
  res
    .status(httpStatusForPrebootstrapBlocked(reason))
    .json(buildPrebootstrapDbReadonlyProofBlockedBody(route, reason));
}
