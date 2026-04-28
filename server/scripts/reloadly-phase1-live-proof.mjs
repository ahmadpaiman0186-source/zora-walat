/**
 * Credential-gated live Reloadly API proof (no money movement).
 *
 * Proves:
 * - OAuth client credentials → access token (real HTTP)
 * - GET /operators for a country (real HTTP)
 *
 * Does **not** POST /topups — that remains proof via sandbox dispatch / paid checkout pipeline
 * (`webtopup:sandbox-dispatch-exercise`, Stripe → webhook → fulfillment) to preserve idempotency guarantees.
 *
 * Usage:
 *   npm run proof:reloadly:live
 *
 * Optional: RELOADLY_PROOF_COUNTRY_CODE=AF (default AF)
 *
 * Exit codes:
 *   0 — token + operators OK (strongest automated proof without a top-up)
 *   1 — credentials present but token or operators failed
 *   2 — Reloadly client id/secret missing
 *
 * JSON includes `reloadlyProofMaturityClass`:
 *   credentials_missing | auth_rejected | credentials_invalid | provider_unavailable |
 *   operator_map_invalid | success_token_and_operators
 *
 * Loads `server/.env` then optional `.env.local` (same order as `bootstrap.js`).
 *
 * IMPORTANT: `../src/config/env.js` must be loaded only AFTER `dotenv.config()` runs.
 * Static `import` of `env.js` is hoisted above this file's body in ESM, which previously
 * made `env.reloadly*` snapshot empty process.env → false `credentials_missing` / `reloadlySandbox`.
 */
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envMain = join(serverRoot, '.env');
if (!existsSync(envMain)) {
  console.warn(`[proof:reloadly:live] Missing ${envMain} — copy from .env.example and add Reloadly credentials`);
}
dotenv.config({
  path: envMain,
  override: process.env.NODE_ENV !== 'production',
  /** Suppress dotenv marketing lines on stdout (can interact badly with some Windows terminals). */
  quiet: true,
});
const envLocal = join(serverRoot, '.env.local');
if (existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true, quiet: true });
}

const { env } = await import('../src/config/env.js');
const { getOperators, isReloadlyConfigured } = await import(
  '../src/services/reloadlyClient.js',
);
const { getReloadlyAccessTokenCached } = await import(
  '../src/services/reloadlyAuthService.js',
);

/** Windows/libuv: exiting right after HTTP can trip `UV_HANDLE_CLOSING`; brief delay before exit. */
function exitAfterTick(code) {
  return new Promise((resolve) => {
    setTimeout(() => {
      process.exit(code);
      resolve();
    }, 50);
  });
}

/**
 * Stable operator-facing classification (do not rename without updating CI consumers).
 * @param {'token' | 'operators'} phase
 * @param {string | undefined} failureCode
 */
function reloadlyProofMaturityClass(phase, failureCode) {
  const c = String(failureCode ?? '');
  if (phase === 'token') {
    if (c === 'reloadly_auth_rejected') return 'auth_rejected';
    if (
      c === 'reloadly_auth_timeout' ||
      c === 'reloadly_auth_server_error' ||
      c === 'reloadly_auth_request_failed'
    ) {
      return 'provider_unavailable';
    }
    if (
      c === 'reloadly_auth_client_error' ||
      c === 'reloadly_auth_unexpected_status' ||
      c === 'reloadly_token_missing'
    ) {
      return 'credentials_invalid';
    }
    return 'credentials_invalid';
  }
  if (phase === 'operators') {
    if (c === 'reloadly_operators_bad_country') return 'operator_map_invalid';
    if (
      c === 'reloadly_operators_timeout' ||
      c === 'reloadly_operators_http' ||
      c === 'reloadly_operators_request_failed' ||
      c === 'reloadly_auth_timeout'
    ) {
      return 'provider_unavailable';
    }
    return 'credentials_invalid';
  }
  return 'credentials_invalid';
}

const operatorMapKeyCount = Object.keys(env.reloadlyOperatorMap ?? {}).length;

const countryCode = String(process.env.RELOADLY_PROOF_COUNTRY_CODE ?? 'AF')
  .trim()
  .toUpperCase()
  .slice(0, 2);

const out = {
  script: 'reloadly-phase1-live-proof',
  /** npm script name is historical; OAuth uses sandbox vs production per `RELOADLY_SANDBOX` + dashboard mode. */
  proofEnvironmentIntent: env.reloadlySandbox ? 'sandbox' : 'production',
  proofScope: 'oauth_token_plus_operators_list',
  excludesTopupPost: true,
  reasonNoTopupPost:
    'Preserves duplicate-send / idempotency guarantees; use sandbox dispatch or checkout pipeline for POST proof',
  reloadlySandbox: env.reloadlySandbox === true,
  /** Effective URLs after env getters (audience = Topups API base URL for client_credentials). */
  reloadlyAuthUrlEffective: env.reloadlyAuthUrl,
  reloadlyAudienceEffective: env.reloadlyBaseUrl,
  airtimeProvider: String(process.env.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase(),
  countryCode,
  operatorMapKeyCount,
};

if (!isReloadlyConfigured()) {
  console.log(
    JSON.stringify({
      ...out,
      proofTier: 'credentials_missing',
      reloadlyProofMaturityClass: 'credentials_missing',
      ok: false,
      nextStep: 'Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET (and RELOADLY_SANDBOX=true for sandbox)',
    }),
  );
  await exitAfterTick(2);
}

const tokenResult = await getReloadlyAccessTokenCached();
if (!tokenResult.ok) {
  const fc = tokenResult.failureCode ?? 'unknown';
  const rs = tokenResult.responseSummary && typeof tokenResult.responseSummary === 'object'
    ? tokenResult.responseSummary
    : {};
  /** Redacted OAuth error body (no secrets): classifies invalid_client vs access_denied vs policy. */
  const oauthErrorClass = {
    httpStatus:
      typeof rs.httpStatus === 'number'
        ? rs.httpStatus
        : typeof rs.httpStatus === 'string'
          ? Number(rs.httpStatus)
          : null,
    oauthErrorCode: rs.error != null ? String(rs.error) : null,
    oauthErrorDescriptionPreview:
      typeof rs.errorDescription === 'string' ? rs.errorDescription.slice(0, 240) : null,
    responseBodyLength:
      typeof rs.responseBodyLength === 'number' ? rs.responseBodyLength : null,
    oauthJsonParsed: typeof rs.oauthJsonParsed === 'boolean' ? rs.oauthJsonParsed : null,
  };
  console.log(
    JSON.stringify({
      ...out,
      proofTier: 'token_failed',
      reloadlyProofMaturityClass: reloadlyProofMaturityClass('token', fc),
      ok: false,
      failureCode: fc,
      oauthErrorClass,
      nextStep:
        fc === 'reloadly_auth_rejected'
          ? 'Reloadly returned 401/403: confirm TEST-mode client id+secret for audience topups-sandbox (dashboard toggle), same app pair, secret not rotated; see oauthErrorClass'
          : 'Verify credentials, RELOADLY_SANDBOX, and network reachability to Reloadly auth',
    }),
  );
  await exitAfterTick(1);
}

const opResult = await getOperators(countryCode);
if (!opResult.ok) {
  const ofc = opResult.failureCode;
  console.log(
    JSON.stringify({
      ...out,
      proofTier: 'operators_failed',
      reloadlyProofMaturityClass: reloadlyProofMaturityClass('operators', ofc),
      ok: false,
      failureCode: ofc,
      failureMessage: String(opResult.failureMessage ?? '').slice(0, 200),
      nextStep: 'Check RELOADLY_SANDBOX matches your Reloadly app; verify countryCode and API audience',
    }),
  );
  await exitAfterTick(1);
}

/** @type {string[]} */
const proofWarnings = [];
if (out.airtimeProvider === 'reloadly' && operatorMapKeyCount === 0) {
  proofWarnings.push(
    'RELOADLY_OPERATOR_MAP_JSON has no keys — Phase 1 AF dispatch will fail operator resolution until mapped',
  );
}

console.log(
  JSON.stringify({
    ...out,
    proofTier: 'live_api_token_and_operators',
    reloadlyProofMaturityClass: 'success_token_and_operators',
    ok: true,
    operatorCount: Array.isArray(opResult.operators) ? opResult.operators.length : 0,
    proofWarnings: proofWarnings.length ? proofWarnings : undefined,
    codeReadiness: 'Reloadly Phase 1 adapter can authenticate and call read APIs; top-up POST proof is separate',
  }),
);
await exitAfterTick(0);
