/**
 * Reloadly POST /topups circuit breaker: **Redis-backed (cluster-wide)** when REDIS_URL is available,
 * with in-process fallback for dev / Redis outage. Distinguishes auth/validation noise from provider degradation
 * and rate-limit regimes (soft backoff).
 */
import { env } from '../config/env.js';
import {
  appendReloadlyCircuitRedisSample,
  readReloadlyCircuitRedisSamples,
  evaluateReloadlyDistributedCircuitWindow,
  deriveReloadlyTopupOutcomeKind,
} from './reloadlyDistributedCircuit.js';

/** @type {{ t: number, kind: string, success: boolean }[]} */
const localSamples = [];

function pruneLocal(windowMs) {
  const cutoff = Date.now() - windowMs;
  while (localSamples.length && localSamples[0].t < cutoff) localSamples.shift();
}

/**
 * @param {{ success: boolean, kind: string }} p
 */
export function recordReloadlyTopupOutcomeLocal(p) {
  if (env.reloadlyCircuitBreakerDisabled) return;
  localSamples.push({
    t: Date.now(),
    kind: String(p.kind ?? 'unknown'),
    success: p.success === true,
  });
  pruneLocal(env.fulfillmentProviderCircuitWindowMs);
}

/**
 * @param {{ success: boolean, kind: string }} p
 */
export async function recordReloadlyTopupOutcome(p) {
  if (env.reloadlyCircuitBreakerDisabled) return;
  const sample = {
    kind: String(p.kind ?? 'unknown'),
    success: p.success === true,
  };
  recordReloadlyTopupOutcomeLocal(sample);
  const r = await appendReloadlyCircuitRedisSample(sample);
  if (!r.ok && env.nodeEnv !== 'test') {
    console.warn(
      JSON.stringify({
        reloadlyCircuit: true,
        event: 'redis_sample_write_failed',
        error: r.error,
      }),
    );
  }
}

/**
 * @returns {Promise<{ hardOpen: boolean, softRateLimit: boolean, usedRedis: boolean }>}
 */
export async function getReloadlyTopupCircuitState() {
  if (env.reloadlyCircuitBreakerDisabled) {
    return { hardOpen: false, softRateLimit: false, usedRedis: false };
  }
  const windowMs = env.fulfillmentProviderCircuitWindowMs;
  const minSamples = env.fulfillmentProviderCircuitMinSamples;
  const failureRatio = env.fulfillmentProviderCircuitFailureRatio;
  const rateLimitSoftMin = env.reloadlyCircuitRateLimitSoftMin;
  const now = Date.now();

  const redisPack = await readReloadlyCircuitRedisSamples();
  if (redisPack.ok) {
    const dist = evaluateReloadlyDistributedCircuitWindow(redisPack.events, now, {
      windowMs,
      minSamples,
      failureRatio,
      rateLimitSoftMin,
    });
    return {
      hardOpen: dist.hardOpen,
      softRateLimit: dist.softRateLimit,
      usedRedis: true,
    };
  }

  pruneLocal(windowMs);
  const distLocal = evaluateReloadlyDistributedCircuitWindow(localSamples, now, {
    windowMs,
    minSamples,
    failureRatio,
    rateLimitSoftMin,
  });
  return {
    hardOpen: distLocal.hardOpen,
    softRateLimit: distLocal.softRateLimit,
    usedRedis: false,
  };
}

/**
 * Hard OPEN or soft 429 regime → caller should back off (BullMQ transient).
 * @returns {Promise<boolean>}
 */
export async function isReloadlyTopupCircuitOpen() {
  const s = await getReloadlyTopupCircuitState();
  return s.hardOpen || s.softRateLimit;
}

/**
 * @param {{ resultType: string, raw?: unknown }} normalizedFromSendTopup
 */
export async function recordReloadlyTopupOutcomeFromSendTopupResult(normalizedFromSendTopup) {
  const { success, kind } = deriveReloadlyTopupOutcomeKind(normalizedFromSendTopup);
  await recordReloadlyTopupOutcome({ success, kind });
}

export { deriveReloadlyTopupOutcomeKind };
