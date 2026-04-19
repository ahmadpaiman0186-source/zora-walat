/**
 * WebTopup user-facing status + copy — maps internal payment/fulfillment/error state to stable UX fields.
 * Never exposes raw provider codes, webhooks, or idempotency terminology.
 */

import {
  FINANCIAL_GUARDRAIL_CODES,
  isWebTopupFinancialGuardrailErrorCode,
} from '../domain/topupOrder/fulfillmentErrors.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../domain/topupOrder/statuses.js';
import { isPersistedFulfillmentErrorRetryable } from '../domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';
import { WEBTOP_SLA_ERROR_CODES } from './webtopSlaPolicy.js';

/**
 * @typedef {'awaiting_payment'|'payment_processing'|'payment_confirmed'|'processing'|'delivered'|'retrying'|'failed_retryable'|'failed_final'|'payment_failed'|'refunded'} WebtopUserStatus
 */

/**
 * @typedef {'wait'|'refresh_status'|'contact_support'|'complete_payment'|'none'} WebtopUserNextAction
 */

/**
 * @param {string | null | undefined} code
 * @returns {boolean}
 */
function isTerminalFulfillmentFailureCode(code) {
  if (code == null || typeof code !== 'string') return true;
  const c = code.trim();
  if (!c) return true;
  if (isWebTopupFinancialGuardrailErrorCode(c)) return true;
  if (c === WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL) return true;
  if (c === 'terminal' || c === 'unsupported_route' || c === 'invalid_product') return true;
  if (c === 'FAILSIM_TERMINAL' || c === 'FAILSIM_UNSUPPORTED') return true;
  return !isPersistedFulfillmentErrorRetryable(c);
}

/**
 * @param {import('../services/topupOrder/topupOrderTypes.js').TopupOrderRecord | Record<string, unknown>} row
 * @returns {{ userStatus: WebtopUserStatus, userMessage: { title: string, description: string, actionHint: string | null }, nextAction: WebtopUserNextAction, isFinal: boolean, isRetryable: boolean }}
 */
export function mapWebtopUserFacingStatus(row) {
  const p = String(row.paymentStatus ?? '');
  const f = String(row.fulfillmentStatus ?? '');
  const err = row.fulfillmentErrorCode != null ? String(row.fulfillmentErrorCode) : null;
  const pi = row.paymentIntentId != null ? String(row.paymentIntentId) : null;

  const nextRetryAt = row.fulfillmentNextRetryAt
    ? new Date(row.fulfillmentNextRetryAt).getTime()
    : null;
  const now = Date.now();
  const hasFutureRetry =
    nextRetryAt != null && Number.isFinite(nextRetryAt) && nextRetryAt > now;

  if (p === PAYMENT_STATUS.REFUNDED) {
    return {
      userStatus: 'refunded',
      userMessage: {
        title: 'Payment refunded',
        description:
          'This payment was refunded. If you still need airtime, start a new top-up.',
        actionHint: null,
      },
      nextAction: 'none',
      isFinal: true,
      isRetryable: false,
    };
  }

  if (p === PAYMENT_STATUS.FAILED) {
    return {
      userStatus: 'payment_failed',
      userMessage: {
        title: 'Payment did not go through',
        description:
          'Your bank or card did not complete the payment. You can try again with the same order if it is still open.',
        actionHint: 'Try the payment again from checkout.',
      },
      nextAction: 'complete_payment',
      isFinal: true,
      isRetryable: false,
    };
  }

  if (p === PAYMENT_STATUS.PENDING) {
    if (pi) {
      return {
        userStatus: 'payment_processing',
        userMessage: {
          title: 'Confirming payment',
          description:
            'We are confirming your payment. This usually takes a few seconds.',
          actionHint: 'Keep this page open.',
        },
        nextAction: 'wait',
        isFinal: false,
        isRetryable: false,
      };
    }
    return {
      userStatus: 'awaiting_payment',
      userMessage: {
        title: 'Waiting for payment',
        description:
          'Complete checkout to send your top-up. Your order stays reserved while you pay.',
        actionHint: 'Finish payment in the secure checkout.',
      },
      nextAction: 'complete_payment',
      isFinal: false,
      isRetryable: false,
    };
  }

  if (p !== PAYMENT_STATUS.PAID) {
    return {
      userStatus: 'failed_final',
      userMessage: {
        title: 'Something went wrong',
        description: 'This order cannot be completed. Please contact support with your order ID.',
        actionHint: null,
      },
      nextAction: 'contact_support',
      isFinal: true,
      isRetryable: false,
    };
  }

  if (f === FULFILLMENT_STATUS.DELIVERED) {
    return {
      userStatus: 'delivered',
      userMessage: {
        title: 'Top-up sent',
        description:
          'Your payment was received and your top-up has been sent.',
        actionHint: null,
      },
      nextAction: 'none',
      isFinal: true,
      isRetryable: false,
    };
  }

  if (f === FULFILLMENT_STATUS.PENDING) {
    return {
      userStatus: 'payment_confirmed',
      userMessage: {
        title: 'Payment received',
        description:
          'Your payment was received. We are starting your top-up now.',
        actionHint: 'This usually begins within a minute.',
      },
      nextAction: 'wait',
      isFinal: false,
      isRetryable: false,
    };
  }

  if (f === FULFILLMENT_STATUS.QUEUED || f === FULFILLMENT_STATUS.PROCESSING) {
    return {
      userStatus: 'processing',
      userMessage: {
        title: 'Sending your top-up',
        description:
          'Your payment is confirmed. We are sending airtime to your number now.',
        actionHint: 'You can refresh this page for the latest status.',
      },
      nextAction: 'wait',
      isFinal: false,
      isRetryable: false,
    };
  }

  if (f === FULFILLMENT_STATUS.RETRYING) {
    return {
      userStatus: 'retrying',
      userMessage: {
        title: 'Trying again',
        description:
          'The first attempt did not finish in time. We are trying again automatically.',
        actionHint: 'Please wait a moment.',
      },
      nextAction: 'wait',
      isFinal: false,
      isRetryable: true,
    };
  }

  if (f === FULFILLMENT_STATUS.FAILED) {
    const guard = err && isWebTopupFinancialGuardrailErrorCode(err);
    const terminal = err && isTerminalFulfillmentFailureCode(err);
    const retryable = err && isPersistedFulfillmentErrorRetryable(err);

    if (guard) {
      let desc =
        'This top-up could not be completed due to account limits or safety checks.';
      if (err === FINANCIAL_GUARDRAIL_CODES.DAILY_CAP) {
        desc =
          'This top-up could not be completed because the daily limit for this number was reached.';
      } else if (err === FINANCIAL_GUARDRAIL_CODES.INVALID_AMOUNT) {
        desc =
          'This top-up could not be completed because the amount did not match our records.';
      }
      return {
        userStatus: 'failed_final',
        userMessage: {
          title: 'Top-up could not be completed',
          description: desc,
          actionHint: 'Contact support if you believe this is a mistake.',
        },
        nextAction: 'contact_support',
        isFinal: true,
        isRetryable: false,
      };
    }

    if (err === WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL) {
      return {
        userStatus: 'failed_final',
        userMessage: {
          title: 'Top-up timed out',
          description:
            'This order took too long to complete and was stopped. Please contact support so we can help.',
          actionHint: null,
        },
        nextAction: 'contact_support',
        isFinal: true,
        isRetryable: false,
      };
    }

    if (retryable && !terminal) {
      if (hasFutureRetry) {
        return {
          userStatus: 'retrying',
          userMessage: {
            title: 'Trying again soon',
            description:
              'The connection was slow. We will try sending your top-up again automatically.',
            actionHint: 'No action needed from you right now.',
          },
          nextAction: 'wait',
          isFinal: false,
          isRetryable: true,
        };
      }
      return {
        userStatus: 'failed_retryable',
        userMessage: {
          title: 'Temporary issue',
          description:
            'We could not finish sending your top-up yet. We are retrying automatically.',
          actionHint: 'Wait a few minutes and refresh this page.',
        },
        nextAction: 'refresh_status',
        isFinal: false,
        isRetryable: true,
      };
    }

    return {
      userStatus: 'failed_final',
      userMessage: {
        title: 'Top-up could not be completed',
        description:
          'We could not complete this top-up. Please contact support with your order ID.',
        actionHint: null,
      },
      nextAction: 'contact_support',
      isFinal: true,
      isRetryable: false,
    };
  }

  return {
    userStatus: 'processing',
    userMessage: {
      title: 'Working on your top-up',
      description: 'Your payment was received. Please check back shortly.',
      actionHint: null,
    },
    nextAction: 'refresh_status',
    isFinal: false,
    isRetryable: false,
  };
}

/**
 * @param {import('../services/topupOrder/topupOrderTypes.js').TopupOrderRecord | Record<string, unknown>} row
 */
export function buildWebtopUserFacingOrderFields(row) {
  return mapWebtopUserFacingStatus(row);
}

/**
 * Polite UX copy for abuse / rate-limit responses (no internal reason strings in title/description).
 * @param {string} abuseReason
 * @param {string} [fallbackMessage]
 */
export function getWebtopAbuseUserFacing(abuseReason, fallbackMessage) {
  /** @type {Record<string, { title: string; description: string; actionHint: string | null }>} */
  const map = {
    abuse_failed_payment_pattern: {
      title: 'Too many attempts',
      description:
        'We paused requests for a short time after several failed payment attempts. Please wait and try again.',
      actionHint: 'Wait a few minutes, then try again.',
    },
    abuse_burst_activity: {
      title: 'Slow down a moment',
      description:
        'You have started several top-ups very quickly. Please wait briefly and try again.',
      actionHint: null,
    },
    abuse_payment_intent_churn: {
      title: 'Too many payment attempts',
      description: 'Please wait a little before trying to pay again.',
      actionHint: null,
    },
    abuse_multi_target_spray: {
      title: 'Too many different numbers',
      description:
        'For safety, please wait before sending to another number from this session.',
      actionHint: null,
    },
    abuse_same_target_spam: {
      title: 'Too many attempts for this number',
      description: 'Please wait before trying this number again.',
      actionHint: null,
    },
  };
  if (map[abuseReason]) {
    return {
      userMessage: map[abuseReason],
      userStatus: 'rate_limited',
    };
  }
  return {
    userStatus: 'rate_limited',
    userMessage: {
      title: 'Request limit',
      description:
        typeof fallbackMessage === 'string' && fallbackMessage.trim()
          ? fallbackMessage.trim()
          : 'We could not complete this request right now. Please try again in a little while.',
      actionHint: null,
    },
  };
}
