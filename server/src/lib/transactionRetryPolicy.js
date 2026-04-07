import {
  TRANSACTION_FAILURE_CLASS,
  isTransientTransactionFailureClass,
} from '../constants/transactionFailureClass.js';

/**
 * Bounded, class-aware retry metadata (orchestrators choose how to apply delays).
 *
 * @param {string} failureClass `TRANSACTION_FAILURE_CLASS` value
 * @param {{ attempt?: number }} [ctx]
 */
export function transactionRetryDirective(failureClass, ctx = {}) {
  const attempt = typeof ctx.attempt === 'number' ? ctx.attempt : 0;
  const transient = isTransientTransactionFailureClass(failureClass);

  if (failureClass === TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED) {
    return {
      mayScheduleRetry: false,
      reason: 'duplicate_idempotent_guard',
      maxAttempts: 0,
      suggestedBackoffMs: null,
    };
  }
  if (
    failureClass === TRANSACTION_FAILURE_CLASS.PERMANENT_VALIDATION ||
    failureClass === TRANSACTION_FAILURE_CLASS.PERMANENT_PAYMENT_MISMATCH ||
    failureClass === TRANSACTION_FAILURE_CLASS.MANUAL_REVIEW_REQUIRED
  ) {
    return {
      mayScheduleRetry: false,
      reason: 'non_transient_class',
      maxAttempts: 0,
      suggestedBackoffMs: null,
    };
  }
  if (!transient) {
    return {
      mayScheduleRetry: false,
      reason: 'unknown_or_unclassified',
      maxAttempts: 0,
      suggestedBackoffMs: null,
    };
  }

  const maxAttempts =
    failureClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_DB ? 6 : 4;
  const base =
    failureClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_STRIPE
      ? 400
      : failureClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER
        ? 600
        : 250;
  const suggestedBackoffMs = Math.min(60_000, base * 2 ** attempt);

  return {
    mayScheduleRetry: attempt < maxAttempts,
    reason: 'transient_backoff',
    maxAttempts,
    suggestedBackoffMs,
  };
}
