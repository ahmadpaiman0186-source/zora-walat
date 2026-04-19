import { FULFILLMENT_SERVICE_CODE } from '../../domain/topupOrder/fulfillmentErrors.js';
import { env } from '../../config/env.js';
import {
  getSharedCircuitBreaker,
  getAllSharedCircuitSnapshots,
} from '../reliability/circuitBreaker.js';

function serviceError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function circuitOpts(name) {
  return {
    name,
    failureThreshold: env.providerCircuitFailureThreshold,
    windowMs: env.providerCircuitWindowMs,
    cooldownMs: env.providerCircuitOpenMs,
  };
}

function breakerFor(providerId) {
  const id = String(providerId ?? 'unknown').toLowerCase();
  return getSharedCircuitBreaker(id, circuitOpts(id));
}

/**
 * Per-provider circuit breaker (in-process; shared with {@link ../providers/providerRouter.js}).
 * @param {string} providerId
 */
export function assertTopupProviderCircuitClosed(providerId) {
  const cb = breakerFor(providerId);
  if (!cb.allowRequest()) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.FULFILLMENT_SUSPENDED,
      `Provider "${cb.name}" is temporarily isolated (circuit open) due to elevated failure rate`,
    );
  }
}

/**
 * @param {string} providerId
 * @param {boolean} success
 */
export function recordTopupProviderCircuitOutcome(providerId, success) {
  const cb = breakerFor(providerId);
  if (success) {
    cb.recordSuccess();
  } else {
    cb.recordFailure();
  }
}

/** For /ready metrics — no secrets. */
export function getTopupProviderCircuitSnapshot() {
  const all = getAllSharedCircuitSnapshots();
  /** @type {Record<string, { open: boolean, openUntil: string | null, recentFailures: number, state: string }>} */
  const out = {};
  for (const [k, v] of Object.entries(all)) {
    out[k] = {
      open: Boolean(v.open),
      openUntil: v.openUntil,
      recentFailures: v.recentFailures,
      state: v.state,
    };
  }
  return out;
}
