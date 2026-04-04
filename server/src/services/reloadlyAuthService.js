import { env } from '../config/env.js';
import { fetchReloadlyAccessToken } from '../domain/fulfillment/reloadlyAuth.js';

/** In-memory only; never log tokens or secrets. */
let cache = {
  /** @type {string | null} */
  token: null,
  expiresAtMs: 0,
};

/**
 * OAuth client-credentials token for Reloadly Topups API, cached until near expiry.
 * Return shape matches `fetchReloadlyAccessToken` (ok + token or structured failure).
 */
export async function getReloadlyAccessTokenCached() {
  const now = Date.now();
  const skewMs = 5000;
  if (cache.token && now < cache.expiresAtMs - skewMs) {
    return { ok: true, accessToken: cache.token, expiresIn: null };
  }

  const result = await fetchReloadlyAccessToken({
    clientId: env.reloadlyClientId,
    clientSecret: env.reloadlyClientSecret,
    sandbox: env.reloadlySandbox,
    timeoutMs: env.airtimeProviderTimeoutMs,
    authUrl: env.reloadlyAuthUrl,
    audience: env.reloadlyBaseUrl,
  });

  if (!result.ok) {
    cache = { token: null, expiresAtMs: 0 };
    return result;
  }

  const ttlSec =
    result.expiresIn != null && Number.isFinite(result.expiresIn)
      ? result.expiresIn
      : 3600;
  const bufferSec = Math.min(120, Math.max(30, Math.floor(ttlSec / 10)));
  cache = {
    token: result.accessToken,
    expiresAtMs: now + Math.max(60, ttlSec - bufferSec) * 1000,
  };

  return { ok: true, accessToken: result.accessToken, expiresIn: result.expiresIn };
}

/** @internal tests */
export function clearReloadlyTokenCacheForTests() {
  cache = { token: null, expiresAtMs: 0 };
}
