import { AIRTIME_OUTCOME } from './airtimeFulfillmentResult.js';
import {
  responseSummarySuggestsFailure,
  responseSummarySuggestsSuccess,
} from './fulfillmentLikelySuccess.js';
import { isRetryableFulfillmentFailure } from './retryPolicy.js';
import { FAILURE_CONFIDENCE } from '../../constants/failureConfidence.js';

function parseJson(str) {
  if (str == null || typeof str !== 'string' || !str.trim()) return null;
  try {
    const o = JSON.parse(str);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
}

/**
 * How confidently we can treat the latest provider outcome as a terminal billing failure.
 * Used to avoid marking PAID orders FAILED when ambiguity remains or DB orchestration is fragile.
 *
 * @param {unknown} _order
 * @param {Array<{ responseSummary?: string | null, status?: string, failureReason?: string | null }>} attempts
 * @param {{ outcome?: string, responseSummary?: unknown, failureCode?: string | null, errorKind?: string | null } | null | undefined} providerResult
 */
export function detectFailureConfidence(_order, attempts, providerResult) {
  void _order;
  const outcome = providerResult?.outcome;
  if (outcome !== AIRTIME_OUTCOME.FAILURE) {
    return FAILURE_CONFIDENCE.UNKNOWN;
  }

  const resObj =
    providerResult?.responseSummary &&
    typeof providerResult.responseSummary === 'object'
      ? providerResult.responseSummary
      : null;
  const norm = resObj?.normalizedOutcome != null ? String(resObj.normalizedOutcome).toLowerCase() : '';
  if (norm === 'ambiguous' || norm === 'pending_verification') {
    return FAILURE_CONFIDENCE.UNKNOWN;
  }
  const proof = resObj?.proofClassification != null ? String(resObj.proofClassification) : '';
  if (proof === 'ambiguous_evidence' || proof === 'pending_provider') {
    return FAILURE_CONFIDENCE.UNKNOWN;
  }
  const diagOnly =
    resObj &&
    typeof resObj === 'object' &&
    Object.keys(resObj).length === 1 &&
    resObj.diagnostic != null;

  if (diagOnly || !resObj) {
    return FAILURE_CONFIDENCE.UNKNOWN;
  }

  const retryable = isRetryableFulfillmentFailure(providerResult);
  if (retryable) {
    return FAILURE_CONFIDENCE.WEAK_FAILURE;
  }

  if (responseSummarySuggestsSuccess(resObj) && responseSummarySuggestsFailure(resObj)) {
    return FAILURE_CONFIDENCE.UNKNOWN;
  }

  if (responseSummarySuggestsFailure(resObj) && !responseSummarySuggestsSuccess(resObj)) {
    return FAILURE_CONFIDENCE.STRONG_FAILURE;
  }

  const explicitCode =
    providerResult.failureCode != null &&
    String(providerResult.failureCode).trim() !== '';
  if (explicitCode && !retryable) {
    return FAILURE_CONFIDENCE.STRONG_FAILURE;
  }

  let terminalAttemptSignal = false;
  for (const a of attempts) {
    const o = parseJson(a.responseSummary ?? null);
    if (o && responseSummarySuggestsFailure(o) && !responseSummarySuggestsSuccess(o)) {
      terminalAttemptSignal = true;
      break;
    }
  }
  if (terminalAttemptSignal && !retryable) {
    return FAILURE_CONFIDENCE.STRONG_FAILURE;
  }

  return FAILURE_CONFIDENCE.UNKNOWN;
}
