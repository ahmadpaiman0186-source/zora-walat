/**
 * WebTopupOrder → Reloadly Topups API — **narrow rollout: Afghanistan + airtime only**.
 * Reuses HTTP + OAuth stack; does not log tokens or full bodies.
 */
import { resolveReloadlyOperatorId } from './reloadlyOperatorMapping.js';

/**
 * @typedef {import('../../services/topupFulfillment/providers/topupProviderTypes.js').TopupFulfillmentRequest} TopupFulfillmentRequest
 * @typedef {import('../../services/topupFulfillment/providers/topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult
 */

/** @const */
export const RELOADLY_WEBTOPUP_ENABLED_COUNTRY = 'AF';

/** @const */
export const RELOADLY_WEBTOPUP_ENABLED_PRODUCT = 'airtime';

/**
 * @param {TopupFulfillmentRequest} req
 * @param {Record<string, string>} operatorMap
 * @returns {{ ok: true, body: object } | { ok: false, code: string, message: string }}
 */
export function buildWebTopupReloadlyPayload(req, operatorMap) {
  const dest = String(req.destinationCountry ?? '').trim().toUpperCase();
  if (dest !== RELOADLY_WEBTOPUP_ENABLED_COUNTRY) {
    return {
      ok: false,
      code: 'reloadly_webtopup_country_not_enabled',
      message: `Reloadly web top-up is limited to ${RELOADLY_WEBTOPUP_ENABLED_COUNTRY} in this rollout`,
    };
  }
  if (String(req.productType) !== RELOADLY_WEBTOPUP_ENABLED_PRODUCT) {
    return {
      ok: false,
      code: 'reloadly_webtopup_product_not_enabled',
      message: `Reloadly web top-up is limited to ${RELOADLY_WEBTOPUP_ENABLED_PRODUCT} in this rollout`,
    };
  }

  const map = operatorMap && typeof operatorMap === 'object' ? operatorMap : {};
  const national = String(req.phoneNationalDigits ?? '').replace(/\D/g, '');
  if (national.length < 8) {
    return {
      ok: false,
      code: 'reloadly_webtopup_phone_invalid',
      message: 'Recipient phone too short for Reloadly top-up',
    };
  }

  const resolved = resolveReloadlyOperatorId(req.operatorKey, map);
  if (!resolved.ok) {
    return {
      ok: false,
      code: resolved.code,
      message: resolved.message,
    };
  }
  const { operatorId } = resolved;

  const cents = req.amountCents;
  if (cents == null || !Number.isFinite(Number(cents)) || Number(cents) <= 0) {
    return {
      ok: false,
      code: 'reloadly_invalid_amount',
      message: 'Invalid amount for Reloadly top-up',
    };
  }

  const amount = (Number(cents) / 100).toFixed(2);
  let number = national;
  if (!number.startsWith('93')) {
    number = `93${number}`;
  }

  return {
    ok: true,
    body: {
      operatorId,
      amount,
      useLocalAmount: false,
      customIdentifier: String(req.orderId).slice(0, 120),
      recipientPhone: {
        countryCode: RELOADLY_WEBTOPUP_ENABLED_COUNTRY,
        number,
      },
    },
  };
}

/**
 * @param {{ ok: false, failureCode?: string, failureMessage?: string }} tokenResult
 * @returns {TopupFulfillmentResult}
 */
export function mapReloadlyTokenFailureToFulfillmentResult(tokenResult) {
  const code = String(tokenResult.failureCode ?? '');
  if (code === 'reloadly_auth_rejected' || code === 'reloadly_auth_client_error') {
    return {
      outcome: 'failed_terminal',
      errorCode: 'auth_failure',
      errorMessageSafe: 'Reloadly OAuth rejected credentials',
    };
  }
  if (
    code === 'reloadly_auth_timeout' ||
    code === 'reloadly_auth_server_error' ||
    code === 'reloadly_token_missing' ||
    code === 'reloadly_auth_unexpected_status'
  ) {
    return {
      outcome: 'failed_retryable',
      errorCode: 'provider_unavailable',
      errorMessageSafe: 'Reloadly auth temporarily unavailable',
    };
  }
  return {
    outcome: 'failed_retryable',
    errorCode: 'provider_unavailable',
    errorMessageSafe: String(tokenResult.failureMessage ?? 'Reloadly auth failed').slice(0, 200),
  };
}

/**
 * Classify Reloadly top-up HTTP/API failure into fulfillment outcomes.
 * @param {object} sendResult — `sendReloadlyTopupRequest` error branch
 * @returns {TopupFulfillmentResult}
 */
export function mapReloadlyTopupFailureToFulfillmentResult(sendResult) {
  const code = String(sendResult.failureCode ?? '');
  const msg = String(sendResult.failureMessage ?? '').toLowerCase();

  if (
    code === 'reloadly_topup_timeout' ||
    code === 'reloadly_topup_server_error' ||
    code === 'reloadly_topup_rate_limited'
  ) {
    return {
      outcome: 'failed_retryable',
      errorCode: 'provider_unavailable',
      errorMessageSafe: String(sendResult.failureMessage ?? 'Reloadly transient error').slice(0, 200),
    };
  }

  if (code === 'reloadly_topup_unauthorized') {
    return {
      outcome: 'failed_retryable',
      errorCode: 'auth_failure_retry',
      errorMessageSafe: 'Reloadly rejected API token; will retry with fresh token',
    };
  }

  if (code === 'reloadly_topup_not_found') {
    return {
      outcome: 'unsupported_route',
      errorCode: 'reloadly_topup_not_found',
      errorMessageSafe: 'Operator or resource not found at provider',
    };
  }

  if (code === 'reloadly_topup_bad_request') {
    if (msg.includes('amount') || msg.includes('denomination') || msg.includes('price')) {
      return {
        outcome: 'invalid_request',
        errorCode: 'AMOUNT_MISMATCH',
        errorMessageSafe: String(sendResult.failureMessage ?? 'Amount rejected').slice(0, 200),
      };
    }
    return {
      outcome: 'invalid_request',
      errorCode: 'INVALID_PRODUCT',
      errorMessageSafe: String(sendResult.failureMessage ?? 'Invalid top-up parameters').slice(0, 200),
    };
  }

  if (code === 'reloadly_topup_not_successful') {
    return {
      outcome: 'failed_terminal',
      errorCode: 'reloadly_topup_not_successful',
      errorMessageSafe: String(sendResult.failureMessage ?? 'Reloadly processed but not successful').slice(
        0,
        200,
      ),
    };
  }

  if (code === 'reloadly_topup_missing_transaction_id') {
    return {
      outcome: 'failed_retryable',
      errorCode: 'provider_response_incomplete',
      errorMessageSafe: 'Reloadly response missing transaction id',
    };
  }

  return {
    outcome: 'failed_terminal',
    errorCode: code || 'reloadly_topup_failed',
    errorMessageSafe: String(sendResult.failureMessage ?? 'Reloadly top-up failed').slice(0, 200),
  };
}

/**
 * @param {{ ok: true, providerReference: string } | { ok: false, failureCode?: string, failureMessage?: string }} r
 * @returns {TopupFulfillmentResult}
 */
export function mapReloadlyTopupSendResultToFulfillmentResult(r) {
  if (r.ok) {
    return {
      outcome: 'succeeded',
      providerReference: r.providerReference,
    };
  }
  return mapReloadlyTopupFailureToFulfillmentResult(r);
}

/**
 * Map build-step failures to fulfillment outcomes.
 * @param {{ ok: false, code: string, message: string }} built
 * @returns {TopupFulfillmentResult}
 */
export function mapReloadlyWebTopupBuildFailureToFulfillmentResult(built) {
  const c = built.code;
  if (c === 'reloadly_webtopup_country_not_enabled' || c === 'reloadly_webtopup_product_not_enabled') {
    return {
      outcome: 'unsupported_route',
      errorCode: c,
      errorMessageSafe: String(built.message).slice(0, 200),
    };
  }
  if (
    c === 'reloadly_operator_unmapped' ||
    c === 'reloadly_operator_key_missing' ||
    c === 'reloadly_operator_id_invalid'
  ) {
    return {
      outcome: 'invalid_request',
      errorCode: 'INVALID_PRODUCT',
      errorMessageSafe: String(built.message).slice(0, 200),
    };
  }
  if (c === 'reloadly_invalid_amount') {
    return {
      outcome: 'invalid_request',
      errorCode: 'AMOUNT_MISMATCH',
      errorMessageSafe: String(built.message).slice(0, 200),
    };
  }
  if (c === 'reloadly_webtopup_phone_invalid') {
    return {
      outcome: 'invalid_request',
      errorCode: 'INVALID_PRODUCT',
      errorMessageSafe: String(built.message).slice(0, 200),
    };
  }
  return {
    outcome: 'failed_terminal',
    errorCode: c,
    errorMessageSafe: String(built.message).slice(0, 200),
  };
}
