import { FULFILLMENT_SERVICE_CODE } from '../../domain/topupOrder/fulfillmentErrors.js';
import { env } from '../../config/env.js';

function serviceError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

/** @type {Map<string, { failuresAt: number[], openUntil: number }>} */
const circuits = new Map();

function cfg() {
  return {
    threshold: env.providerCircuitFailureThreshold,
    windowMs: env.providerCircuitWindowMs,
    openMs: env.providerCircuitOpenMs,
  };
}

/**
 * Per-provider circuit breaker (in-process; use shared store when horizontally scaling).
 * @param {string} providerId
 */
export function assertTopupProviderCircuitClosed(providerId) {
  const id = String(providerId ?? 'unknown').toLowerCase();
  const c = circuits.get(id);
  if (!c) return;
  if (Date.now() < c.openUntil) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.FULFILLMENT_SUSPENDED,
      `Provider "${id}" is temporarily isolated (circuit open) due to elevated failure rate`,
    );
  }
}

/**
 * @param {string} providerId
 * @param {boolean} success
 */
export function recordTopupProviderCircuitOutcome(providerId, success) {
  const id = String(providerId ?? 'unknown').toLowerCase();
  const { threshold, windowMs, openMs } = cfg();
  const now = Date.now();
  let st = circuits.get(id) ?? { failuresAt: [], openUntil: 0 };

  if (success) {
    st.failuresAt = [];
    st.openUntil = 0;
  } else {
    st.failuresAt.push(now);
    st.failuresAt = st.failuresAt.filter((t) => now - t <= windowMs);
    if (st.failuresAt.length >= threshold) {
      st.openUntil = now + openMs;
    }
  }
  circuits.set(id, st);
}

/** For /ready metrics — no secrets. */
export function getTopupProviderCircuitSnapshot() {
  const out = {};
  const now = Date.now();
  for (const [k, v] of circuits.entries()) {
    out[k] = {
      open: now < v.openUntil,
      openUntil: v.openUntil > now ? new Date(v.openUntil).toISOString() : null,
      recentFailures: v.failuresAt.length,
    };
  }
  return out;
}
