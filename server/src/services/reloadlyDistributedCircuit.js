/**
 * Redis-backed sliding-window samples for Reloadly POST /topups health (multi-instance).
 * LIST `zora:circuit:reloadly:topups:v1` — JSON lines { t, kind, success }.
 */
import { withRedis } from './redisClient.js';
import { env } from '../config/env.js';

export const RELOADLY_CIRCUIT_REDIS_LIST_KEY = 'zora:circuit:reloadly:topups:v1';

/**
 * Outcome kinds for circuit logic (not 1:1 HTTP).
 * - `auth` / `validation`: excluded from provider-degradation ratio.
 * - `rate_limit`: drives soft backoff regime separately from hard OPEN.
 * @typedef {'ok' | 'transient' | 'rate_limit' | 'auth' | 'validation' | 'ambiguous' | 'unknown'} ReloadlyCircuitKind
 */

/**
 * @param {unknown} normalized sendTopup result shape
 * @returns {{ success: boolean, kind: string }}
 */
export function deriveReloadlyTopupOutcomeKind(normalized) {
  const rt = String(normalized?.resultType ?? '');
  if (rt === 'confirmed' || rt === 'pending') {
    return { success: true, kind: 'ok' };
  }
  if (rt === 'ambiguous') {
    return { success: false, kind: 'ambiguous' };
  }
  const raw = normalized?.raw;
  if (raw && typeof raw === 'object' && raw.phase === 'auth') {
    return { success: false, kind: 'auth' };
  }
  if (raw && typeof raw === 'object' && raw.kind === 'failed') {
    const fc = String(raw.failureCode ?? '');
    if (fc === 'reloadly_topup_rate_limited') {
      return { success: false, kind: 'rate_limit' };
    }
    if (fc === 'reloadly_topup_bad_request') {
      return { success: false, kind: 'validation' };
    }
    if (fc === 'reloadly_topup_unauthorized') {
      return { success: false, kind: 'auth' };
    }
    if (fc === 'reloadly_topup_timeout') {
      return { success: false, kind: 'transient' };
    }
    return { success: false, kind: 'transient' };
  }
  return { success: false, kind: 'unknown' };
}

/**
 * @param {Array<{ t: number, kind: string, success: boolean }>} events
 * @param {number} nowMs
 * @param {{ windowMs: number, minSamples: number, failureRatio: number, rateLimitSoftMin: number }} opts
 */
export function evaluateReloadlyDistributedCircuitWindow(events, nowMs, opts) {
  const cutoff = nowMs - opts.windowMs;
  const inWindow = events.filter((e) => e.t >= cutoff);
  let rateLimitHits = 0;
  let degradationFails = 0;
  /** Events that speak to shared provider health (excludes local auth/config/validation noise). */
  let eligible = 0;
  for (const e of inWindow) {
    const k = String(e.kind ?? 'unknown');
    if (k === 'auth' || k === 'validation') {
      continue;
    }
    eligible += 1;
    if (k === 'rate_limit') {
      rateLimitHits += 1;
    }
    if (!e.success && (k === 'transient' || k === 'ambiguous' || k === 'unknown')) {
      degradationFails += 1;
    }
  }
  const softRateLimit = rateLimitHits >= opts.rateLimitSoftMin;
  const hardOpen =
    eligible >= opts.minSamples &&
    degradationFails / eligible > opts.failureRatio;
  return { hardOpen, softRateLimit, rateLimitHits, eligible, degradationFails };
}

/**
 * @param {{ success: boolean, kind: string }} p
 */
export async function appendReloadlyCircuitRedisSample(p) {
  const maxLen = env.reloadlyCircuitRedisListMax;
  const line = JSON.stringify({
    t: Date.now(),
    kind: p.kind,
    success: p.success === true,
  });
  return withRedis(async (c) => {
    await c.lPush(RELOADLY_CIRCUIT_REDIS_LIST_KEY, line);
    await c.lTrim(RELOADLY_CIRCUIT_REDIS_LIST_KEY, 0, maxLen - 1);
    await c.expire(RELOADLY_CIRCUIT_REDIS_LIST_KEY, Math.ceil(env.fulfillmentProviderCircuitWindowMs / 1000) + 120);
  });
}

/**
 * @returns {Promise<{ ok: boolean, events: Array<{ t: number, kind: string, success: boolean }> }>}
 */
export async function readReloadlyCircuitRedisSamples() {
  const maxLen = env.reloadlyCircuitRedisListMax;
  const r = await withRedis((c) => c.lRange(RELOADLY_CIRCUIT_REDIS_LIST_KEY, 0, maxLen - 1));
  if (!r.ok) {
    return { ok: false, events: [] };
  }
  const lines = /** @type {string[]} */ (r.value ?? []);
  const events = [];
  for (const line of lines) {
    try {
      const o = JSON.parse(line);
      if (o && typeof o === 'object' && typeof o.t === 'number') {
        events.push({
          t: o.t,
          kind: String(o.kind ?? 'unknown'),
          success: o.success === true,
        });
      }
    } catch {
      /* skip */
    }
  }
  return { ok: true, events };
}
