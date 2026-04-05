import { AIRTIME_OUTCOME } from './airtimeFulfillmentResult.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../constants/fulfillmentAttemptStatus.js';

const MIN_ATTEMPT_MS = 400;
const MAX_ATTEMPT_MS = 20 * 60 * 1000;
const MAX_ATTEMPTS_LOOP = 12;

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
 * Reloadly + internal shapes: non-sensitive fields only.
 * @param {unknown} o
 */
export function responseSummarySuggestsSuccess(o) {
  if (!o || typeof o !== 'object') return false;
  const norm = o.normalizedOutcome != null ? String(o.normalizedOutcome).toLowerCase() : '';
  if (
    norm === 'pending_verification' ||
    norm === 'ambiguous' ||
    norm === 'failure_unconfirmed'
  ) {
    return false;
  }
  const out = o.outcome != null ? String(o.outcome).toLowerCase() : '';
  if (out === AIRTIME_OUTCOME.SUCCESS || out === 'success' || out === 'succeeded') {
    return true;
  }
  const st = o.status != null ? String(o.status).toUpperCase() : '';
  if (st === 'SUCCESSFUL') return true;
  if (o.transactionId != null && String(o.transactionId).trim() !== '') {
    if (st === '' || st === 'SUCCESSFUL') return true;
  }
  if (o.ok === true && o.httpStatus != null && o.httpStatus < 400) return true;
  return false;
}

export function responseSummarySuggestsFailure(o) {
  if (!o || typeof o !== 'object') return false;
  const norm = o.normalizedOutcome != null ? String(o.normalizedOutcome).toLowerCase() : '';
  if (norm === 'pending_verification') return false;
  const proof = o.proofClassification != null ? String(o.proofClassification) : '';
  if (proof === 'pending_provider') return false;
  if (o.httpStatus != null && Number(o.httpStatus) >= 400) return true;
  const out = o.outcome != null ? String(o.outcome).toLowerCase() : '';
  if (out === 'failure' || out === AIRTIME_OUTCOME.FAILURE) return true;
  if (o.errorCode != null || o.failureCode != null) return true;
  const st = o.status != null ? String(o.status).toUpperCase() : '';
  if (st && st !== 'SUCCESSFUL') return true;
  return false;
}

/**
 * @param {Array<{ status: string, providerReference?: string | null, responseSummary?: string | null, requestSummary?: string | null, startedAt?: Date | null, completedAt?: Date | null, failedAt?: Date | null }>} attempts
 */
export function evaluateProviderEvidenceLayer(attempts) {
  let hasReference = false;
  let suggestsSuccess = false;
  let suggestsFailure = false;
  let ambiguousOutcome = false;

  for (const a of attempts) {
    const ref = a.providerReference != null && String(a.providerReference).trim() !== '';
    if (ref) hasReference = true;

    const o = parseJson(a.responseSummary);
    if (o) {
      if (responseSummarySuggestsSuccess(o)) suggestsSuccess = true;
      if (responseSummarySuggestsFailure(o)) suggestsFailure = true;
    }
  }

  if (hasReference && suggestsFailure && !suggestsSuccess) {
    ambiguousOutcome = true;
  }
  if (hasReference && !suggestsSuccess && !suggestsFailure) {
    ambiguousOutcome = true;
  }

  const strong =
    suggestsSuccess ||
    (hasReference &&
      attempts.some((a) => {
        const o = parseJson(a.responseSummary);
        return o && responseSummarySuggestsSuccess(o);
      }));

  return {
    hasReference,
    suggestsSuccess,
    suggestsFailure,
    ambiguousOutcome,
    strong,
  };
}

/**
 * @param {{ orderStatus: string }} order
 * @param {Array<{ status: string, attemptNumber: number, startedAt?: Date | null, completedAt?: Date | null, failedAt?: Date | null, responseSummary?: string | null }>} attempts
 */
export function evaluateBehavioralEvidenceLayer(order, attempts) {
  let succeededAttempt = false;
  let durationOkProcessing = false;
  let validStructure = true;
  let abnormalLoop = attempts.length > MAX_ATTEMPTS_LOOP;

  for (const a of attempts) {
    if (a.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
      succeededAttempt = true;
      if (a.startedAt && a.completedAt) {
        const d = a.completedAt.getTime() - a.startedAt.getTime();
        if (d >= MIN_ATTEMPT_MS && d <= MAX_ATTEMPT_MS) {
          /* normal completion window */
        }
      }
    }
    if (
      a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING &&
      a.startedAt &&
      order.orderStatus === ORDER_STATUS.PROCESSING
    ) {
      const elapsed = Date.now() - a.startedAt.getTime();
      if (elapsed >= MIN_ATTEMPT_MS && elapsed <= MAX_ATTEMPT_MS) {
        durationOkProcessing = true;
      }
    }
    if (a.responseSummary != null && a.responseSummary !== '') {
      const o = parseJson(a.responseSummary);
      if (a.responseSummary.trim() !== '{}' && o == null) validStructure = false;
    }
  }

  return {
    succeededAttempt,
    durationOkProcessing,
    validStructure,
    abnormalLoop,
    strong: succeededAttempt,
  };
}

/**
 * @param {{ marginNetUsdCents?: number | null, orderStatus: string }} order
 * @param {{ marginRecorded: boolean, orderDelivered: boolean, deliveryAudit: boolean, loyaltyGrant: boolean }} financial
 */
export function combineLikelyFulfillmentSuccess(order, attempts, provider, behavioral, financial) {
  const finAny = financialLayerAny(financial);

  if (financial.orderDelivered || order.orderStatus === ORDER_STATUS.FULFILLED) {
    return { likely: true, highRisk: false, reason: 'order_delivered' };
  }
  if (financial.marginRecorded || financial.loyaltyGrant || financial.deliveryAudit) {
    return { likely: true, highRisk: false, reason: 'financial_confirmation' };
  }
  if (behavioral.succeededAttempt) {
    return { likely: true, highRisk: false, reason: 'attempt_succeeded' };
  }
  if (provider.strong) {
    return {
      likely: true,
      highRisk: order.orderStatus === ORDER_STATUS.PROCESSING && !finAny,
      reason: 'provider_success_signals',
    };
  }

  const conflicting = provider.suggestsSuccess && provider.suggestsFailure;
  const incompleteProviderState =
    provider.hasReference &&
    !finAny &&
    order.orderStatus === ORDER_STATUS.PROCESSING &&
    attempts.some((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING);

  const highRisk = conflicting || incompleteProviderState || provider.ambiguousOutcome;

  return {
    likely: false,
    highRisk,
    reason: highRisk ? 'incomplete_or_conflicting' : 'no_strong_signals',
  };
}

export function financialLayerAny(financial) {
  return (
    financial.marginRecorded ||
    financial.orderDelivered ||
    financial.deliveryAudit ||
    financial.loyaltyGrant
  );
}
