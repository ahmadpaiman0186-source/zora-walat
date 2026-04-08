/**
 * Adapter boundary: coerce provider I/O into shapes the fulfillment completion
 * transaction can reason about. Never fabricates SUCCESS; invalid shapes route
 * to the unknown-outcome / manual-review path (not terminal FAILED).
 */
import { AIRTIME_ERROR_KIND, AIRTIME_OUTCOME_VALUES } from './airtimeFulfillmentResult.js';
import { bumpCounter } from '../../lib/opsMetrics.js';

/**
 * @param {unknown} raw
 * @param {{ orderId?: string }} [ctx]
 * @returns {Record<string, unknown>}
 */
export function normalizeFulfillmentProviderResult(raw, ctx = {}) {
  const orderIdSuffix =
    ctx.orderId && typeof ctx.orderId === 'string'
      ? ctx.orderId.slice(-12)
      : null;

  if (raw == null || typeof raw !== 'object') {
    bumpCounter('fulfillment_provider_result_malformed');
    console.warn(
      JSON.stringify({
        fulfillmentProviderNormalize: true,
        event: 'malformed_provider_result',
        orderIdSuffix,
        detail: raw == null ? 'null_or_undefined' : typeof raw,
        t: new Date().toISOString(),
      }),
    );
    return {
      outcome: undefined,
      providerKey: 'unknown',
      failureCode: 'provider_non_object_result',
      errorKind: AIRTIME_ERROR_KIND.UNKNOWN,
      requestSummary: {},
      responseSummary: {
        normalization: 'replaced_non_object',
      },
    };
  }

  const base = /** @type {Record<string, unknown>} */ ({ ...raw });
  const o = base.outcome;
  if (o == null || (typeof o === 'string' && !String(o).trim())) {
    bumpCounter('fulfillment_provider_outcome_missing');
    console.warn(
      JSON.stringify({
        fulfillmentProviderNormalize: true,
        event: 'missing_provider_outcome',
        orderIdSuffix,
        providerKey: base.providerKey ?? null,
        t: new Date().toISOString(),
      }),
    );
    const prev =
      base.responseSummary && typeof base.responseSummary === 'object'
        ? /** @type {Record<string, unknown>} */ ({ ...base.responseSummary })
        : {};
    prev.normalization = 'outcome_was_missing';
    return {
      ...base,
      outcome: undefined,
      responseSummary: prev,
    };
  }

  const normalized = String(o).trim().toLowerCase();
  if (!AIRTIME_OUTCOME_VALUES.includes(normalized)) {
    bumpCounter('fulfillment_provider_outcome_not_in_enum');
    console.warn(
      JSON.stringify({
        fulfillmentProviderNormalize: true,
        event: 'unknown_provider_outcome_string',
        orderIdSuffix,
        rawOutcome: String(o).slice(0, 80),
        t: new Date().toISOString(),
      }),
    );
    const prev =
      base.responseSummary && typeof base.responseSummary === 'object'
        ? /** @type {Record<string, unknown>} */ ({ ...base.responseSummary })
        : {};
    prev.normalization = 'outcome_not_in_enum';
    prev.rawOutcome = String(o).slice(0, 120);
    return {
      ...base,
      outcome: undefined,
      responseSummary: prev,
    };
  }

  return {
    ...base,
    outcome: normalized,
  };
}
