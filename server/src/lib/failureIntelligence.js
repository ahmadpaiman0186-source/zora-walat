import { FAILURE_INTELLIGENCE_CLASS } from '../constants/failureIntelligenceClass.js';
import {
  TRANSACTION_FAILURE_CLASS,
  classifyTransactionFailure,
  isTransientTransactionFailureClass,
} from '../constants/transactionFailureClass.js';
import { scheduleLabeledCounterIncr } from './redisMetricsAggregator.js';
import { env } from '../config/env.js';
import { bumpCounter } from './opsMetrics.js';

/**
 * Maps low-level transaction classification + context into SRE-facing buckets.
 * @param {{ error?: unknown, failureClass?: string, surface?: string, exhaustedRetries?: boolean }} p
 * @returns {{ intelligenceClass: string, transactionClass: string }}
 */
export function classifyFailureIntelligence(p) {
  const surface = p.surface ?? 'unknown';
  const exhausted = p.exhaustedRetries === true;
  const transactionClass = p.failureClass
    ? String(p.failureClass)
    : classifyTransactionFailure(p.error ?? new Error('unknown'), { surface });

  if (exhausted) {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.RETRY_EXHAUSTED,
      transactionClass,
    };
  }

  if (isTransientTransactionFailureClass(transactionClass)) {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.TRANSIENT,
      transactionClass,
    };
  }

  const msg = String(p.error?.message ?? p.error ?? '').toLowerCase();
  if (
    transactionClass === TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER ||
    msg.includes('reloadly') ||
    /provider|topup/.test(msg)
  ) {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.PROVIDER_FAILURE,
      transactionClass,
    };
  }
  if (msg.includes('unavailable') || msg.includes('econnrefused')) {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.UNAVAILABLE,
      transactionClass,
    };
  }
  if (transactionClass === TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED) {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.DUPLICATE_BLOCKED,
      transactionClass,
    };
  }
  if (
    transactionClass === TRANSACTION_FAILURE_CLASS.PERMANENT_VALIDATION ||
    transactionClass === TRANSACTION_FAILURE_CLASS.PERMANENT_PAYMENT_MISMATCH
  ) {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.VALIDATION,
      transactionClass,
    };
  }

  if (surface === 'fulfillment_worker') {
    return {
      intelligenceClass: FAILURE_INTELLIGENCE_CLASS.ORCHESTRATION_ERROR,
      transactionClass,
    };
  }

  return {
    intelligenceClass: FAILURE_INTELLIGENCE_CLASS.UNKNOWN,
    transactionClass,
  };
}

/**
 * Records cluster-wide failure intelligence counter (Redis when enabled).
 * @param {string} intelligenceClass
 * @param {string} transactionClass
 * @param {{ queue?: string, surface?: string }} [dims]
 */
export function recordFailureIntelligenceMetric(
  intelligenceClass,
  transactionClass,
  dims = {},
) {
  if (!env.metricsRedisAggregation) return;
  scheduleLabeledCounterIncr(
    'zora_failure_intelligence_total',
    {
      class: String(intelligenceClass).slice(0, 64),
      txn: String(transactionClass).slice(0, 64),
      queue: String(dims.queue ?? 'phase1_fulfillment'),
      surface: String(dims.surface ?? 'unknown').slice(0, 48),
    },
    1,
  );
}
