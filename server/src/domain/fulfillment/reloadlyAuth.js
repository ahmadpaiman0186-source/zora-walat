import { AIRTIME_ERROR_KIND } from './airtimeFulfillmentResult.js';
import { classifyProviderError } from './classifyProviderError.js';

/** Single OAuth issuer for Reloadly (sandbox vs production is selected via `audience`). */
export const RELOADLY_OAUTH_TOKEN_URL = 'https://auth.reloadly.com/oauth/token';

const TOPUPS_AUDIENCE = {
  sandbox: 'https://topups-sandbox.reloadly.com',
  production: 'https://topups.reloadly.com',
};

/**
 * Airtime / mobile top-ups API audience — required in the token request body.
 * @param {boolean} sandbox — from `RELOADLY_SANDBOX`
 */
export function getReloadlyTopupsAudienceUrl(sandbox) {
  return sandbox ? TOPUPS_AUDIENCE.sandbox : TOPUPS_AUDIENCE.production;
}

function safeAuthErrorSummary(status, json) {
  const err = json && typeof json === 'object' ? json.error : null;
  const desc =
    json && typeof json === 'object' && typeof json.error_description === 'string'
      ? json.error_description.slice(0, 200)
      : null;
  return {
    httpStatus: status,
    error: err != null ? String(err) : null,
    errorDescription: desc,
  };
}

/**
 * Map OAuth HTTP response to domain error (no secrets, no raw body).
 * @param {number} status
 * @param {object | null} json
 */
function classifyAuthHttpFailure(status, json) {
  if (status === 408 || status === 504) {
    return {
      errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
      failureCode: 'reloadly_auth_timeout',
      failureMessage: 'Reloadly auth request timed out or gateway timeout',
      responseSummary: safeAuthErrorSummary(status, json),
    };
  }
  if (status === 401 || status === 403) {
    return {
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      failureCode: 'reloadly_auth_rejected',
      failureMessage: 'Reloadly rejected client credentials',
      responseSummary: safeAuthErrorSummary(status, json),
    };
  }
  if (status >= 400 && status < 500) {
    return {
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      failureCode: 'reloadly_auth_client_error',
      failureMessage: 'Reloadly auth request failed (client error)',
      responseSummary: safeAuthErrorSummary(status, json),
    };
  }
  if (status >= 500) {
    return {
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_auth_server_error',
      failureMessage: 'Reloadly auth service error',
      responseSummary: safeAuthErrorSummary(status, json),
    };
  }
  return {
    errorKind: AIRTIME_ERROR_KIND.UNKNOWN,
    failureCode: 'reloadly_auth_unexpected_status',
    failureMessage: `Reloadly auth returned HTTP ${status}`,
    responseSummary: safeAuthErrorSummary(status, json),
  };
}

/**
 * Client-credentials token for the Topups (airtime) API. Server-only; never log secrets.
 *
 * @param {object} params
 * @param {string} params.clientId
 * @param {string} params.clientSecret
 * @param {boolean} params.sandbox
 * @param {number} params.timeoutMs
 * @returns {Promise<
 *   | { ok: true, accessToken: string, expiresIn: number | null }
 *   | { ok: false, errorKind: string, failureCode: string, failureMessage: string, responseSummary: object }
 * >}
 * `accessToken` is for immediate in-memory use only — never log, never persist, discard after the top-up request.
 */
export async function fetchReloadlyAccessToken({
  clientId,
  clientSecret,
  sandbox,
  timeoutMs,
  /** @type {string | undefined} */ authUrl,
  /** @type {string | undefined} */ audience,
}) {
  const tokenUrl = authUrl ?? RELOADLY_OAUTH_TOKEN_URL;
  const aud = audience ?? getReloadlyTopupsAudienceUrl(sandbox);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        audience: aud,
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const f = classifyAuthHttpFailure(res.status, json);
      return { ok: false, ...f };
    }

    const accessToken =
      json && typeof json.access_token === 'string' ? json.access_token : null;
    if (!accessToken) {
      return {
        ok: false,
        errorKind: AIRTIME_ERROR_KIND.CONFIG,
        failureCode: 'reloadly_token_missing',
        failureMessage: 'Reloadly auth response missing access_token',
        responseSummary: { httpStatus: res.status, parseError: !json },
      };
    }

    const expiresIn =
      json && typeof json.expires_in === 'number' && Number.isFinite(json.expires_in)
        ? json.expires_in
        : null;

    return { ok: true, accessToken, expiresIn };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
        failureCode: 'reloadly_auth_timeout',
        failureMessage: 'Reloadly auth request aborted (timeout)',
        responseSummary: {},
      };
    }
    const { errorKind, failureCode } = classifyProviderError(err);
    const failureMessage = String(err?.message ?? err ?? 'reloadly_auth_request_failed').slice(
      0,
      300,
    );
    return {
      ok: false,
      errorKind,
      failureCode,
      failureMessage,
      responseSummary: {
        errno: err?.errno ?? null,
        code: err?.code != null ? String(err.code) : null,
        name: err?.name != null ? String(err.name) : null,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
