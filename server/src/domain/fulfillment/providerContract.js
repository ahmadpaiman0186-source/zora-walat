/**
 * Formal adapter boundary for airtime fulfillment providers (mock, Reloadly, future).
 * Validates raw adapter output **before** `normalizeFulfillmentProviderResult` coerces edge cases.
 * Contract version: bump when adding required fields for new providers.
 */
import {
  AIRTIME_ERROR_KIND,
  AIRTIME_OUTCOME,
  AIRTIME_OUTCOME_VALUES,
  isValidAirtimeOutcome,
} from './airtimeFulfillmentResult.js';

export const AIRTIME_ADAPTER_RESULT_CONTRACT_VERSION = 1;

/**
 * @typedef {object} AirtimeAdapterResult
 * @property {string} outcome One of `AIRTIME_OUTCOME_VALUES`.
 * @property {string} [providerKey] mock | reloadly | …
 * @property {string} [failureCode]
 * @property {string} [failureMessage]
 * @property {string} [errorKind] One of AIRTIME_ERROR_KIND values when failure-shaped.
 * @property {Record<string, unknown>} [requestSummary]
 * @property {Record<string, unknown>} [responseSummary]
 */

/**
 * Structural validation at the provider boundary (no I/O).
 * Invalid shapes must never be treated as success downstream; fulfillment normalizer still defends.
 *
 * @param {unknown} raw
 * @returns {{ valid: true, issues: [] } | { valid: false, issues: string[] }}
 */
export function validateAirtimeAdapterResult(raw) {
  /** @type {string[]} */
  const issues = [];
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push('result_not_plain_object');
    return { valid: false, issues };
  }
  const o = /** @type {Record<string, unknown>} */ (raw);
  const oc = o.outcome;
  if (oc == null || (typeof oc === 'string' && !String(oc).trim())) {
    issues.push('outcome_missing');
  } else if (!isValidAirtimeOutcome(oc)) {
    issues.push('outcome_not_in_enum');
  }

  const pk = o.providerKey;
  if (
    oc != null &&
    isValidAirtimeOutcome(oc) &&
    String(oc).trim().toLowerCase() === AIRTIME_OUTCOME.SUCCESS
  ) {
    if (typeof pk !== 'string' || !pk.trim()) {
      issues.push('success_requires_provider_key');
    }
  }

  if (
    oc != null &&
    isValidAirtimeOutcome(oc) &&
    String(oc).trim().toLowerCase() === AIRTIME_OUTCOME.FAILURE
  ) {
    const ek = o.errorKind;
    if (typeof ek === 'string' && ek.trim()) {
      const allowed = new Set(Object.values(AIRTIME_ERROR_KIND));
      if (!allowed.has(String(ek).trim().toLowerCase())) {
        issues.push('error_kind_not_in_enum');
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export { AIRTIME_OUTCOME_VALUES, AIRTIME_OUTCOME, AIRTIME_ERROR_KIND };
