/**
 * Marks a Reloadly top-up POST attempt in-flight in Redis so retries can detect ambiguity (timeout / ghost send).
 */
import { createHash } from 'node:crypto';
import { withRedis } from './redisClient.js';
import { env } from '../config/env.js';

const PREFIX = 'zora:reloadly:inflight:topup:v1:';

function inflightKey(customIdentifier) {
  const id = String(customIdentifier ?? '').trim().slice(0, 200);
  if (!id) return '';
  const enc = createHash('sha256').update(id).digest('hex').slice(0, 48);
  return `${PREFIX}${enc}`;
}

/**
 * @param {string} customIdentifier
 * @param {{ traceId?: string | null }} meta
 */
export async function markReloadlyTopupPostInFlight(customIdentifier, meta = {}) {
  const key = inflightKey(customIdentifier);
  if (!key) return { ok: false };
  const ttl = Math.ceil(env.reloadlyTopupInFlightTtlSeconds);
  const payload = JSON.stringify({
    t: Date.now(),
    traceId: meta.traceId ?? null,
    customIdentifier: String(customIdentifier).trim(),
  });
  return withRedis((c) => c.set(key, payload, { EX: ttl }));
}

/**
 * @param {string} customIdentifier
 */
export async function clearReloadlyTopupPostInFlight(customIdentifier) {
  const key = inflightKey(customIdentifier);
  if (!key) return { ok: false };
  return withRedis((c) => c.del(key));
}

/**
 * @param {string} customIdentifier
 * @returns {Promise<boolean>}
 */
export async function isReloadlyTopupPostInFlight(customIdentifier) {
  const key = inflightKey(customIdentifier);
  if (!key) return false;
  const r = await withRedis((c) => c.exists(key));
  if (!r.ok) return false;
  return Number(r.value ?? 0) > 0;
}
