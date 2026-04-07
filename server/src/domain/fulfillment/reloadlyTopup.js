import { AIRTIME_ERROR_KIND } from './airtimeFulfillmentResult.js';
import { classifyProviderError } from './classifyProviderError.js';
import { getReloadlyTopupsAudienceUrl } from './reloadlyAuth.js';
import { resolveReloadlyOperatorId } from './reloadlyOperatorMapping.js';

const ACCEPT = 'application/com.reloadly.topups-v1+json';

/** Reloadly-reported top-up lifecycle (subset; unknown strings → ambiguous). */
const RELOADLY_SUCCESS = new Set(['SUCCESSFUL']);
const RELOADLY_PENDING = new Set([
  'PENDING',
  'PROCESSING',
  'IN_PROGRESS',
  'INPROGRESS',
  'SUBMITTED',
  'QUEUED',
  'INITIATED',
]);
const RELOADLY_EXPLICIT_FAIL = new Set([
  'FAILED',
  'FAILURE',
  'DECLINED',
  'REJECTED',
  'CANCELLED',
  'CANCELED',
  'REFUNDED',
  'ERROR',
]);

function providerRefFromTransactionId(tid) {
  if (tid == null || String(tid).trim() === '') return null;
  return `reloadly_tx_${String(tid)}`.slice(0, 120);
}

/**
 * Truth-first HTTP 200 body classification — never returns raw Reloadly payload to callers.
 * @param {object | null} json
 * @returns {{ kind: 'confirmed', providerReference: string, responseSummary: object } | { kind: 'pending', providerReference: string | null, responseSummary: object } | { kind: 'failed', errorKind: string, failureCode: string, failureMessage: string, responseSummary: object } | { kind: 'ambiguous', errorKind: string, failureCode: string, failureMessage: string, responseSummary: object }}
 */
export function classifyReloadlyTopupHttp200Body(json) {
  const baseSummary = safeReloadlyTopupResponseSummary(json);
  const statusRaw =
    json && typeof json === 'object' && json.status != null ? String(json.status) : '';
  const u = statusRaw.trim().toUpperCase();
  const tid =
    json && typeof json === 'object' && json.transactionId != null ? json.transactionId : null;

  if (RELOADLY_SUCCESS.has(u)) {
    if (tid == null) {
      return {
        kind: 'ambiguous',
        errorKind: AIRTIME_ERROR_KIND.PROVIDER,
        failureCode: 'reloadly_topup_ambiguous_response',
        failureMessage: 'Reloadly reported successful status without transactionId',
        responseSummary: {
          ...baseSummary,
          normalizedOutcome: 'ambiguous',
          proofClassification: 'ambiguous_evidence',
        },
      };
    }
    return {
      kind: 'confirmed',
      providerReference: providerRefFromTransactionId(tid),
      responseSummary: {
        ...baseSummary,
        normalizedOutcome: 'confirmed',
        proofClassification: 'confirmed_delivery',
      },
    };
  }

  if (RELOADLY_PENDING.has(u)) {
    return {
      kind: 'pending',
      providerReference: providerRefFromTransactionId(tid),
      responseSummary: {
        ...baseSummary,
        normalizedOutcome: 'pending_verification',
        proofClassification: 'pending_provider',
      },
    };
  }

  if (u && RELOADLY_EXPLICIT_FAIL.has(u)) {
    return {
      kind: 'failed',
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_explicit_failure',
      failureMessage: `Reloadly top-up terminal status: ${u.slice(0, 80)}`,
      responseSummary: {
        ...baseSummary,
        normalizedOutcome: 'explicit_failure',
        proofClassification: 'explicit_non_delivery',
      },
    };
  }

  if (!u && tid != null) {
    return {
      kind: 'ambiguous',
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_ambiguous_response',
      failureMessage:
        'Reloadly returned transactionId without a recognizable status — proof incomplete',
      responseSummary: {
        ...baseSummary,
        normalizedOutcome: 'ambiguous',
        proofClassification: 'ambiguous_evidence',
      },
    };
  }

  if (!u && tid == null) {
    return {
      kind: 'ambiguous',
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_ambiguous_response',
      failureMessage:
        'Reloadly top-up HTTP 200 with missing status and transactionId — cannot prove outcome',
      responseSummary: {
        ...baseSummary,
        normalizedOutcome: 'ambiguous',
        proofClassification: 'ambiguous_evidence',
      },
    };
  }

  return {
    kind: 'ambiguous',
    errorKind: AIRTIME_ERROR_KIND.PROVIDER,
    failureCode: 'reloadly_topup_ambiguous_response',
    failureMessage: `Reloadly returned unrecognized status: ${u.slice(0, 80)}`,
    responseSummary: {
      ...baseSummary,
      normalizedOutcome: 'ambiguous',
      proofClassification: 'ambiguous_evidence',
    },
  };
}

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
  if (status === 409) {
    return {
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      failureCode: 'reloadly_topup_duplicate',
      failureMessage: 'Reloadly rejected duplicate top-up request (idempotency conflict)',
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
/** Whitelisted cost-hint fields (no PII) — passed through when Reloadly returns them for reconciliation. */
const RELOADLY_COST_HINT_KEYS = [
  'wholesaleAmount',
  'wholesalePrice',
  'providerCost',
  'cost',
  'operatorCost',
  'operatorAmountUSD',
  'paidToOperatorUSD',
  'pinCost',
  'costUSD',
];

export function safeReloadlyTopupResponseSummary(json) {
  if (!json || typeof json !== 'object') {
    return {};
  }
  const base = {
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
  for (const k of RELOADLY_COST_HINT_KEYS) {
    const v = json[k];
    if (v == null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      base[k] = v;
    } else if (typeof v === 'string' && v.trim()) {
      base[k] = v.trim().slice(0, 32);
    }
  }
  return base;
}

/**
 * Build POST /topups body from a paid checkout row (Afghan mobile — matches checkout normalization).
 * Required Reloadly fields: operatorId, amount, recipientPhone.{countryCode,number}.
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {Record<string, string>} operatorMap — `env.reloadlyOperatorMap` (never send catalog keys as operatorId)
 * @param {{ customIdentifier?: string, providerRequestKey?: string }} [opts] — attempt-scoped idempotency key for Reloadly customIdentifier
 * @returns {{ ok: true, body: object, providerRequestKey: string } | { ok: false, code: string, message: string }}
 */
export function buildReloadlyTopupPayload(order, operatorMap, opts = {}) {
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
  const ext =
    opts.customIdentifier != null && String(opts.customIdentifier).trim()
      ? String(opts.customIdentifier).trim().slice(0, 120)
      : String(order.id).slice(0, 120);
  const providerRequestKey =
    opts.providerRequestKey != null && String(opts.providerRequestKey).trim()
      ? String(opts.providerRequestKey).trim().slice(0, 160)
      : ext;

  return {
    ok: true,
    providerRequestKey,
    body: {
      operatorId,
      amount,
      useLocalAmount: false,
      customIdentifier: ext,
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
 * @returns {Promise<
 *   | { kind: 'confirmed', providerReference: string, responseSummary: object }
 *   | { kind: 'pending', providerReference: string | null, responseSummary: object }
 *   | { kind: 'ambiguous', errorKind: string, failureCode: string, failureMessage: string, responseSummary: object }
 *   | { kind: 'failed', errorKind: string, failureCode: string, failureMessage: string, responseSummary: object }
 * >}
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
      return {
        kind: 'failed',
        errorKind: f.errorKind,
        failureCode: f.failureCode,
        failureMessage: f.failureMessage,
        responseSummary: {
          ...(f.responseSummary && typeof f.responseSummary === 'object' ? f.responseSummary : {}),
          normalizedOutcome: 'transport_or_http_failure',
          proofClassification: 'no_delivery_proof',
          httpStatus: res.status,
        },
      };
    }

    const classified = classifyReloadlyTopupHttp200Body(json);
    if (classified.kind === 'confirmed') {
      return classified;
    }
    if (classified.kind === 'pending') {
      return classified;
    }
    if (classified.kind === 'failed') {
      return classified;
    }
    return classified;
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        kind: 'failed',
        errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
        failureCode: 'reloadly_topup_timeout',
        failureMessage: 'Reloadly top-up request aborted (timeout)',
        responseSummary: {
          normalizedOutcome: 'transport_or_http_failure',
          proofClassification: 'no_delivery_proof',
        },
      };
    }
    const { errorKind, failureCode } = classifyProviderError(err);
    const failureMessage = String(err?.message ?? err ?? 'reloadly_topup_request_failed').slice(
      0,
      300,
    );
    return {
      kind: 'failed',
      errorKind,
      failureCode,
      failureMessage,
      responseSummary: {
        errno: err?.errno ?? null,
        code: err?.code != null ? String(err.code) : null,
        name: err?.name != null ? String(err.name) : null,
        normalizedOutcome: 'transport_or_http_failure',
        proofClassification: 'no_delivery_proof',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
