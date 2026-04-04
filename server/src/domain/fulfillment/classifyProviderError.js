import { AIRTIME_ERROR_KIND } from './airtimeFulfillmentResult.js';

/**
 * Map thrown errors (fetch, node http, AbortController) to a safe, diagnosable kind.
 * Does not include stack traces or response bodies (may contain secrets).
 */
export function classifyProviderError(err) {
  const code = err?.code;
  const name = err?.name;

  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    name === 'AbortError' ||
    /timeout/i.test(String(err?.message ?? ''))
  ) {
    return {
      errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
      failureCode: 'provider_timeout',
    };
  }

  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ENETUNREACH' ||
    code === 'CERT_HAS_EXPIRED'
  ) {
    return {
      errorKind: AIRTIME_ERROR_KIND.NETWORK,
      failureCode: 'provider_network_error',
    };
  }

  return {
    errorKind: AIRTIME_ERROR_KIND.UNKNOWN,
    failureCode: 'provider_exception',
  };
}

/**
 * Safe diagnostic blob for persistence (no raw HTTP bodies).
 */
export function safeErrorDiagnostics(err) {
  return {
    errno: err?.errno ?? null,
    code: err?.code != null ? String(err.code) : null,
    name: err?.name != null ? String(err.name) : null,
  };
}
