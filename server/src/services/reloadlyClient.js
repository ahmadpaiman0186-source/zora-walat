import { env } from '../config/env.js';
import {
  AIRTIME_ERROR_KIND,
  AIRTIME_OUTCOME,
} from '../domain/fulfillment/airtimeFulfillmentResult.js';
import {
  buildReloadlyTopupPayload,
  sendReloadlyTopupRequest,
} from '../domain/fulfillment/reloadlyTopup.js';
import { getReloadlyAccessTokenCached } from './reloadlyAuthService.js';

const ACCEPT = 'application/com.reloadly.topups-v1+json';

export function isReloadlyConfigured() {
  return (
    String(env.reloadlyClientId ?? '').trim().length > 0 &&
    String(env.reloadlyClientSecret ?? '').trim().length > 0
  );
}

function safeRecipientHint(national) {
  if (!national || typeof national !== 'string' || national.length < 4) {
    return null;
  }
  return `***${national.slice(-4)}`;
}

/**
 * GET /operators — Bearer token; no secrets in logs.
 * @param {string} countryCode ISO 3166-1 alpha-2
 * @returns {Promise<{ ok: true, operators: object[], raw: any } | { ok: false, failureCode: string, failureMessage: string, operators: [], raw: any }>}
 */
export async function getOperators(countryCode) {
  const cc = String(countryCode ?? '')
    .trim()
    .toUpperCase();
  if (!cc || cc.length !== 2) {
    return {
      ok: false,
      failureCode: 'reloadly_operators_bad_country',
      failureMessage: 'Invalid country code',
      operators: [],
      raw: null,
    };
  }

  const tokenResult = await getReloadlyAccessTokenCached();
  if (!tokenResult.ok) {
    return {
      ok: false,
      failureCode: tokenResult.failureCode,
      failureMessage: tokenResult.failureMessage,
      operators: [],
      raw: tokenResult.responseSummary ?? null,
    };
  }

  const base = env.reloadlyBaseUrl.replace(/\/$/, '');
  const url = `${base}/operators?countryCode=${encodeURIComponent(cc)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.airtimeProviderTimeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: ACCEPT,
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
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
      return {
        ok: false,
        failureCode: 'reloadly_operators_http',
        failureMessage: `Reloadly operators HTTP ${res.status}`,
        operators: [],
        raw: json,
      };
    }

    const list = Array.isArray(json)
      ? json
      : json && typeof json === 'object'
        ? json.content ?? json.data ?? []
        : [];
    const operators = Array.isArray(list) ? list : [];

    return { ok: true, operators, raw: json };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        failureCode: 'reloadly_operators_timeout',
        failureMessage: 'Reloadly operators request timed out',
        operators: [],
        raw: null,
      };
    }
    return {
      ok: false,
      failureCode: 'reloadly_operators_request_failed',
      failureMessage: String(err?.message ?? err ?? 'request_failed').slice(0, 200),
      operators: [],
      raw: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /topups — normalized outcome for integrations.
 * @param {object} p
 * @param {string} p.phone — recipient number as required by Reloadly (e.g. international digits).
 * @param {number|string} p.operatorId
 * @param {string} p.amount — decimal string "0.00"
 * @param {string} p.countryCode — ISO country code for recipient phone
 * @param {string} [p.customIdentifier] — idempotency / correlation (e.g. order id)
 * @returns {Promise<{ success: boolean, providerReference: string, raw: any }>}
 */
export async function sendTopup({ phone, operatorId, amount, countryCode, customIdentifier }) {
  const amountStr =
    typeof amount === 'string' ? amount : Number(amount).toFixed(2);
  const body = {
    operatorId,
    amount: amountStr,
    useLocalAmount: false,
    recipientPhone: {
      countryCode: String(countryCode ?? '')
        .trim()
        .toUpperCase(),
      number: String(phone ?? '').trim(),
    },
  };
  if (customIdentifier != null && String(customIdentifier).trim()) {
    body.customIdentifier = String(customIdentifier).trim();
  }

  const tokenResult = await getReloadlyAccessTokenCached();
  if (!tokenResult.ok) {
    return {
      success: false,
      providerReference: '',
      raw: { phase: 'auth', ...tokenResult },
    };
  }

  const topup = await sendReloadlyTopupRequest({
    accessToken: tokenResult.accessToken,
    sandbox: env.reloadlySandbox,
    body,
    timeoutMs: env.airtimeProviderTimeoutMs,
    baseUrl: env.reloadlyBaseUrl,
  });

  if (!topup.ok) {
    return {
      success: false,
      providerReference: '',
      raw: topup,
    };
  }

  return {
    success: true,
    providerReference: topup.providerReference,
    raw: topup.responseSummary,
  };
}

/**
 * Paid checkout → Reloadly top-up (uses {@link sendTopup}).
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 */
export async function fulfillReloadlyDelivery(order) {
  const apiBase = env.reloadlyBaseUrl;
  const requestSummary = {
    mode: 'reloadly',
    sandbox: env.reloadlySandbox,
    audienceUrl: apiBase,
    topupsPath: `${String(apiBase).replace(/\/$/, '')}/topups`,
    packageId: order.packageId ?? null,
    operatorKey: order.operatorKey ?? null,
    recipientHint: safeRecipientHint(order.recipientNational),
    amountUsdCents: order.amountUsdCents,
    currency: order.currency,
  };

  if (!isReloadlyConfigured()) {
    return {
      outcome: AIRTIME_OUTCOME.UNAVAILABLE,
      providerKey: 'reloadly',
      failureCode: 'reloadly_not_configured',
      failureMessage: 'Reloadly credentials not set in environment',
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      requestSummary,
      responseSummary: {},
    };
  }

  const payload = buildReloadlyTopupPayload(order, env.reloadlyOperatorMap);
  if (!payload.ok) {
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'reloadly',
      failureCode: payload.code,
      failureMessage: payload.message,
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      requestSummary,
      responseSummary: {},
    };
  }

  const b = payload.body;
  const normalized = await sendTopup({
    phone: b.recipientPhone.number,
    operatorId: b.operatorId,
    amount: b.amount,
    countryCode: b.recipientPhone.countryCode,
    customIdentifier: b.customIdentifier,
  });

  if (!normalized.success) {
    const raw = normalized.raw;
    if (raw && typeof raw === 'object' && raw.ok === false) {
      return {
        outcome: AIRTIME_OUTCOME.FAILURE,
        providerKey: 'reloadly',
        failureCode: raw.failureCode ?? 'reloadly_topup_failed',
        failureMessage: raw.failureMessage ?? 'Reloadly top-up failed',
        errorKind: raw.errorKind ?? AIRTIME_ERROR_KIND.PROVIDER,
        requestSummary,
        responseSummary: raw.responseSummary ?? {},
      };
    }
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'reloadly',
      failureCode: 'reloadly_topup_failed',
      failureMessage: 'Reloadly top-up failed',
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      requestSummary,
      responseSummary: {},
    };
  }

  return {
    outcome: AIRTIME_OUTCOME.SUCCESS,
    providerKey: 'reloadly',
    providerReference: normalized.providerReference,
    requestSummary,
    responseSummary: {
      ...(typeof normalized.raw === 'object' && normalized.raw ? normalized.raw : {}),
      topupsBaseUsed: env.reloadlyBaseUrl,
    },
  };
}
