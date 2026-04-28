import { TRANSACTION_FAILURE_CLASS } from '../constants/transactionFailureClass.js';

/** Maps money-path failure taxonomy to compact operational labels for logs/metrics. */
const FROM_TX_CLASS = Object.freeze({
  [TRANSACTION_FAILURE_CLASS.TRANSIENT_DB]: 'transient_db',
  [TRANSACTION_FAILURE_CLASS.TRANSIENT_STRIPE]: 'transient_stripe',
  [TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER]: 'transient_provider',
  [TRANSACTION_FAILURE_CLASS.PERMANENT_VALIDATION]: 'permanent_validation',
  [TRANSACTION_FAILURE_CLASS.PERMANENT_PAYMENT_MISMATCH]: 'permanent_payment_mismatch',
  [TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED]: 'permanent_duplicate_blocked',
  [TRANSACTION_FAILURE_CLASS.MANUAL_REVIEW_REQUIRED]: 'manual_review_required',
  [TRANSACTION_FAILURE_CLASS.UNKNOWN]: 'unknown',
});

/**
 * @param {string} transactionFailureClass
 * @returns {string}
 */
export function operationalClassFromTransactionFailure(transactionFailureClass) {
  const k = String(transactionFailureClass ?? '').trim();
  return FROM_TX_CLASS[k] ?? 'unknown';
}
