import { AIRTIME_ERROR_KIND } from './airtimeFulfillmentResult.js';
import { classifyProviderError } from './classifyProviderError.js';
import { getReloadlyTopupsAudienceUrl } from './reloadlyAuth.js';
import { resolveReloadlyOperatorId } from './reloadlyOperatorMapping.js';

const ACCEPT = 'application/com.reloadly.topups-v1+json';

function safeTopupErrorSummary(status, json) {
  const msg =
    json && typeof json === 'object' && json.message != null
      ? String(json.message).slice(0, 200)
      : null;
  const errCode =
    json && typeof json === 'object' && json.errorCode != null
      ? String(json.errorCode).slice(0, 80)
      : null;
  return {
    httpStatus: status,
    message: msg,
    errorCode: errCode,
  };
}

/**
 * Map Topups API HTTP errors (no raw bodies; short strings only).
 */
function classifyTopupHttpFailure(status, json) {
  if (status === 408 || status === 504) {
    return {
      errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
      failureCode: 'reloadly_topup_timeout',
      failureMessage: 'Reloadly top-up request timed out or gateway timeout',
      responseSummary: safeTopupErrorSummary(status, json),
    };
  }
  if (status === 401 || status === 403) {
    return {
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      failureCode: 'reloadly_topup_unauthorized',
      failureMessage: 'Reloadly top-up rejected authorization',
      responseSummary: safeTopupErrorSummary(status, json),
    };
  }
  if (status === 400) {
    return {
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_bad_request',
      failureMessage: 'Reloadly rejected top-up parameters',
      responseSummary: safeTopupErrorSummary(status, json),
    };
  }
  if (status === 404) {
    return {
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_not_found',
      failureMessage: 'Reloadly top-up resource not found',
      responseSummary: safeTopupErrorSummary(status, json),
    };
  }
  if (status === 429) {
    return {
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_rate_limited',
      failureMessage: 'Reloadly rate limited the top-up request',
      responseSummary: safeTopupErrorSummary(status, json),
    };
  }
  if (status >= 500) {
    return {
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_server_error',
      failureMessage: 'Reloadly top-up service error',
      responseSummary: safeTopupErrorSummary(status, json),
    };
  }
  return {
    errorKind: AIRTIME_ERROR_KIND.UNKNOWN,
    failureCode: 'reloadly_topup_unexpected_status',
    failureMessage: `Reloadly top-up returned HTTP ${status}`,
    responseSummary: safeTopupErrorSummary(status, json),
  };
}

/**
 * Safe subset of a successful top-up JSON (no PINs, no balance details).
 * @param {object} json
 */
export function safeReloadlyTopupResponseSummary(json) {
  if (!json || typeof json !== 'object') {
    return {};
  }
  return {
    transactionId: json.transactionId != null ? Number(json.transactionId) : null,
    status: json.status != null ? String(json.status) : null,
    operatorTransactionId:
      json.operatorTransactionId != null
        ? String(json.operatorTransactionId).slice(0, 120)
        : null,
    operatorId: json.operatorId != null ? json.operatorId : null,
    operatorName:
      json.operatorName != null ? String(json.operatorName).slice(0, 80) : null,
  };
}

/**
 * Build POST /topups body from a paid checkout row (Afghan mobile — matches checkout normalization).
 * Required Reloadly fields: operatorId, amount, recipientPhone.{countryCode,number}.
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {Record<string, string>} operatorMap — `env.reloadlyOperatorMap` (never send catalog keys as operatorId)
 * @returns {{ ok: true, body: object } | { ok: false, code: string, message: string }}
 */
export function buildReloadlyTopupPayload(order, operatorMap) {
  const map = operatorMap && typeof operatorMap === 'object' ? operatorMap : {};

  const national =
    order.recipientNational != null ? String(order.recipientNational).trim() : '';
  if (!national) {
    return {
      ok: false,
      code: 'reloadly_order_incomplete',
      message: 'Missing recipientNational for Reloadly top-up',
    };
  }

  const resolved = resolveReloadlyOperatorId(order.operatorKey, map);
  if (!resolved.ok) {
    return {
      ok: false,
      code: resolved.code,
      message: resolved.message,
    };
  }
  const { operatorId } = resolved;

  const cents = order.amountUsdCents;
  if (cents == null || !Number.isFinite(Number(cents)) || Number(cents) <= 0) {
    return {
      ok: false,
      code: 'reloadly_invalid_amount',
      message: 'Invalid amountUsdCents for Reloadly top-up',
    };
  }

  const amount = (Number(cents) / 100).toFixed(2);
  const recipientNumber = `93${national}`;

  return {
    ok: true,
    body: {
      operatorId,
      amount,
      useLocalAmount: false,
      customIdentifier: String(order.id),
      recipientPhone: {
        countryCode: 'AF',
        number: recipientNumber,
      },
    },
  };
}

/**
 * POST /topups — Bearer token must not be logged or persisted.
 *
 * @param {object} p
 * @param {string} p.accessToken — memory only; discard after await
 * @param {boolean} p.sandbox
 * @param {object} p.body — Reloadly JSON body
 * @param {number} p.timeoutMs
 * @param {string} [p.baseUrl] — overrides sandbox-derived base (must match OAuth `audience`).
 */
export async function sendReloadlyTopupRequest({ accessToken, sandbox, body, timeoutMs, baseUrl }) {
  const base =
    baseUrl != null && String(baseUrl).trim()
      ? String(baseUrl).trim().replace(/\/$/, '')
      : getReloadlyTopupsAudienceUrl(sandbox);
  const url = `${base.replace(/\/$/, '')}/topups`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: ACCEPT,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
      const f = classifyTopupHttpFailure(res.status, json);
      return { ok: false, ...f };
    }

    const statusStr =
      json && typeof json === 'object' && json.status != null
        ? String(json.status)
        : '';
    if (statusStr && statusStr !== 'SUCCESSFUL') {
      return {
        ok: false,
        errorKind: AIRTIME_ERROR_KIND.PROVIDER,
        failureCode: 'reloadly_topup_not_successful',
        failureMessage: `Reloadly top-up status: ${statusStr.slice(0, 80)}`,
        responseSummary: safeReloadlyTopupResponseSummary(json),
      };
    }

    const tid =
      json && typeof json === 'object' && json.transactionId != null
        ? json.transactionId
        : null;
    if (tid == null) {
      return {
        ok: false,
        errorKind: AIRTIME_ERROR_KIND.PROVIDER,
        failureCode: 'reloadly_topup_missing_transaction_id',
        failureMessage: 'Reloadly top-up response missing transactionId',
        responseSummary: safeReloadlyTopupResponseSummary(json),
      };
    }

    const providerReference = `reloadly_tx_${String(tid)}`;

    return {
      ok: true,
      providerReference: String(providerReference).slice(0, 120),
      responseSummary: safeReloadlyTopupResponseSummary(json),
    };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
        failureCode: 'reloadly_topup_timeout',
        failureMessage: 'Reloadly top-up request aborted (timeout)',
        responseSummary: {},
      };
    }
    const { errorKind, failureCode } = classifyProviderError(err);
    const failureMessage = String(err?.message ?? err ?? 'reloadly_topup_request_failed').slice(
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
