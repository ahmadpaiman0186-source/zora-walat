/**
 * Gateway for critical outbound calls: bounded retry + shared circuit breaker + trace + structured decisions.
 * Money-path safety: callers must still pass Stripe idempotency keys on mutating Stripe APIs — retries reuse the same key.
 */

import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { classifyErrorToExplicitCategory, isLikelyNetworkError } from './failureModel.js';
import { getSharedCircuitBreaker } from './circuitBreaker.js';
import { withRetry } from './retryEngine.js';
import { enrichReliabilityDecisionWithSeverity } from './failureSeverity.js';
import { recordReliabilityDecision } from './watchdog.js';

export const STRIPE_API_CIRCUIT_KEY = 'stripe_api';
export const RECHARGE_PROVIDER_CIRCUIT_KEY = 'recharge_provider';

function stripeSharedCircuitOpts() {
  return {
    name: STRIPE_API_CIRCUIT_KEY,
    failureThreshold: env.providerCircuitFailureThreshold,
    windowMs: env.providerCircuitWindowMs,
    cooldownMs: env.providerCircuitOpenMs,
    halfOpenMaxCalls: 1,
  };
}

function rechargeSharedCircuitOpts() {
  return {
    name: RECHARGE_PROVIDER_CIRCUIT_KEY,
    failureThreshold: env.providerCircuitFailureThreshold,
    windowMs: env.providerCircuitWindowMs,
    cooldownMs: env.providerCircuitOpenMs,
    halfOpenMaxCalls: 1,
  };
}

/**
 * Stripe transient errors safe for bounded retry (same idempotency key on each attempt).
 * @param {unknown} err
 * @returns {boolean}
 */
export function isStripeErrorRetryable(err) {
  if (!err || typeof err !== 'object') return false;
  if (isLikelyNetworkError(err)) return true;
  const type = /** @type {{ type?: string }} */ (err).type;
  if (type === 'StripeConnectionError') return true;
  if (type === 'StripeAPIError') {
    const code = /** @type {{ code?: string }} */ (err).code;
    if (code === 'rate_limit') return true;
    const sc = /** @type {{ statusCode?: number }} */ (err).statusCode;
    if (typeof sc === 'number' && sc >= 500) return true;
  }
  return false;
}

/**
 * Count only transient/provider-class failures toward opening the Stripe circuit (not card/business 4xx).
 * @param {unknown} err
 * @returns {boolean}
 */
export function shouldStripeFailureCountTowardCircuit(err) {
  return isStripeErrorRetryable(err);
}

/**
 * @param {object} ctx
 * @param {string} ctx.operationName
 * @param {string | null | undefined} ctx.traceId
 * @param {import('pino').Logger | undefined} ctx.log
 * @param {() => Promise<T>} ctx.fn
 * @param {number} [ctx.maxAttempts]
 * @param {number[]} [ctx.backoffMs]
 * @param {boolean} [ctx.useCircuit] default true — set false for best-effort cleanup (e.g. cancel) so OPEN state does not block user-facing responses.
 * @template T
 * @returns {Promise<T>}
 */
export async function orchestrateStripeCall(ctx) {
  const {
    operationName,
    traceId,
    log,
    fn,
    maxAttempts = env.webtopupRetryMaxAttempts,
    backoffMs = env.webtopupRetryBackoffMs,
    useCircuit = true,
  } = ctx;

  /** @type {{ allowRequest: () => boolean, recordSuccess: () => void, recordFailure: () => void } | null} */
  let cb = null;
  if (useCircuit) {
    cb = getSharedCircuitBreaker(STRIPE_API_CIRCUIT_KEY, stripeSharedCircuitOpts());
    if (!cb.allowRequest()) {
      recordReliabilityDecision(
        enrichReliabilityDecisionWithSeverity(
          {
            layer: 'reliability_orchestrator',
            operationName,
            traceId: traceId ?? null,
            outcome: 'deny',
            reason: 'circuit_open',
            circuit: STRIPE_API_CIRCUIT_KEY,
          },
          Object.assign(new Error('stripe_circuit_open'), {
            code: 'stripe_circuit_open',
          }),
        ),
      );
      log?.warn?.(
        {
          reliability: true,
          operationName,
          traceId: traceId ?? null,
          circuit: STRIPE_API_CIRCUIT_KEY,
        },
        'stripe_api circuit open',
      );
      throw new HttpError(503, 'Payment provider temporarily unavailable', {
        code: 'stripe_circuit_open',
        operationalClass: 'reliability',
      });
    }
  }

  const r = await withRetry(fn, {
    maxAttempts,
    backoffMs,
    traceId: traceId ?? null,
    label: `stripe:${operationName}`,
    shouldRetryError: (err) => isStripeErrorRetryable(err),
  });

  if (!r.ok) {
    const last = r.error;
    if (cb && shouldStripeFailureCountTowardCircuit(last)) {
      cb.recordFailure();
    }
    recordReliabilityDecision(
      enrichReliabilityDecisionWithSeverity(
        {
          layer: 'reliability_orchestrator',
          operationName,
          traceId: traceId ?? null,
          outcome: 'retry_exhausted',
          category: classifyErrorToExplicitCategory(last),
          attempts: r.attempts,
        },
        last,
      ),
    );
    throw last;
  }

  if (cb) {
    cb.recordSuccess();
  }
  recordReliabilityDecision(
    enrichReliabilityDecisionWithSeverity({
      layer: 'reliability_orchestrator',
      operationName,
      traceId: traceId ?? null,
      outcome: 'ok',
      attempts: r.attempts,
    }),
  );
  return r.value;
}

/**
 * Local/sync recharge provider facade — circuit + bounded retry on transport-like failures only.
 * @param {object} ctx
 * @param {string} ctx.operationName
 * @param {string | null | undefined} ctx.traceId
 * @param {import('pino').Logger | undefined} ctx.log
 * @param {() => Promise<T>} ctx.fn
 * @template T
 * @returns {Promise<T>}
 */
export async function orchestrateRechargeProviderCall(ctx) {
  const { operationName, traceId, log, fn } = ctx;
  const cb = getSharedCircuitBreaker(RECHARGE_PROVIDER_CIRCUIT_KEY, rechargeSharedCircuitOpts());
  if (!cb.allowRequest()) {
    recordReliabilityDecision(
      enrichReliabilityDecisionWithSeverity(
        {
          layer: 'reliability_orchestrator',
          operationName,
          traceId: traceId ?? null,
          outcome: 'deny',
          reason: 'circuit_open',
          circuit: RECHARGE_PROVIDER_CIRCUIT_KEY,
        },
        Object.assign(new Error('recharge_circuit_open'), {
          code: 'recharge_circuit_open',
        }),
      ),
    );
    log?.warn?.(
      { reliability: true, operationName, traceId: traceId ?? null },
      'recharge_provider circuit open',
    );
    throw new HttpError(503, 'Recharge provider temporarily unavailable', {
      code: 'recharge_circuit_open',
      operationalClass: 'reliability',
    });
  }

  const r = await withRetry(fn, {
    maxAttempts: env.webtopupRetryMaxAttempts,
    backoffMs: env.webtopupRetryBackoffMs,
    traceId: traceId ?? null,
    label: `recharge:${operationName}`,
    shouldRetryError: (err) => isLikelyNetworkError(err),
  });

  if (!r.ok) {
    if (isLikelyNetworkError(r.error)) {
      cb.recordFailure();
    }
    recordReliabilityDecision(
      enrichReliabilityDecisionWithSeverity(
        {
          layer: 'reliability_orchestrator',
          operationName,
          traceId: traceId ?? null,
          outcome: 'retry_exhausted',
          category: classifyErrorToExplicitCategory(r.error),
          attempts: r.attempts,
        },
        r.error,
      ),
    );
    throw r.error;
  }
  cb.recordSuccess();
  recordReliabilityDecision(
    enrichReliabilityDecisionWithSeverity({
      layer: 'reliability_orchestrator',
      operationName,
      traceId: traceId ?? null,
      outcome: 'ok',
      attempts: r.attempts,
    }),
  );
  return r.value;
}
