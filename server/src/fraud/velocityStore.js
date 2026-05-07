/**
 * L6 velocity counters — Redis when available, deterministic in-memory fallback.
 * Keys are logical (`fraud:user:…`); Redis prefixes with `zora_walat:l6:` to avoid collisions.
 */

import { withRedis } from '../services/redisClient.js';

const REDIS_PREFIX = 'zora_walat:l6';

/** @type {Map<string, { expiresAt: number, count: number }>} */
const memCounters = new Map();
/** @type {Map<string, { expiresAt: number, members: Map<string, number> }>} */
const memDistinct = new Map();

function pruneMem(now) {
  for (const [k, v] of memCounters) {
    if (v.expiresAt <= now) memCounters.delete(k);
  }
  for (const [k, v] of memDistinct) {
    if (v.expiresAt <= now) memDistinct.delete(k);
    else {
      for (const [m, t] of v.members) {
        if (t < now - (v.windowTtlMs ?? 0)) v.members.delete(m);
      }
    }
  }
}

function normRedisKey(logicalKey) {
  return `${REDIS_PREFIX}:${logicalKey}`;
}

/**
 * @param {string} ip
 */
export function normalizeIpForVelocityKey(ip) {
  const raw = String(ip ?? '')
    .trim()
    .replace(/^::ffff:/i, '');
  const s = raw || '0.0.0.0';
  return s.replace(/[^a-zA-Z0-9.:_-]/g, '_').slice(0, 120);
}

function normOperatorKey(op) {
  return String(op ?? 'none')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
}

/**
 * @param {string} logicalKey e.g. fraud:user:<id>
 * @param {number} ttlSeconds
 * @returns {Promise<number>} count after increment
 */
export async function incrementWindow(logicalKey, ttlSeconds) {
  const ttl = Math.max(1, Math.floor(ttlSeconds));
  const rk = normRedisKey(logicalKey);
  const r = await withRedis(async (client) => {
    const n = await client.incr(rk);
    await client.expire(rk, ttl);
    return Number(n) || 0;
  });
  if (r.ok) return r.value;

  const now = Date.now();
  pruneMem(now);
  const expiresAt = now + ttl * 1000;
  const prev = memCounters.get(logicalKey);
  if (!prev || prev.expiresAt <= now) {
    memCounters.set(logicalKey, { expiresAt, count: 1 });
    return 1;
  }
  prev.expiresAt = expiresAt;
  prev.count += 1;
  return prev.count;
}

/**
 * @param {string} logicalKey
 * @returns {Promise<number>}
 */
export async function getWindowCount(logicalKey) {
  const rk = normRedisKey(logicalKey);
  const r = await withRedis(async (client) => {
    const raw = await client.get(rk);
    return Number(raw) || 0;
  });
  if (r.ok) return r.value;

  const now = Date.now();
  pruneMem(now);
  const prev = memCounters.get(logicalKey);
  if (!prev || prev.expiresAt <= now) return 0;
  return prev.count;
}

/**
 * Track distinct members in a TTL window (SADD semantics). Returns count after add.
 * @param {string} logicalKey
 * @param {string} member
 * @param {number} ttlSeconds
 */
export async function addDistinctToWindow(logicalKey, member, ttlSeconds) {
  const ttl = Math.max(1, Math.floor(ttlSeconds));
  const rk = normRedisKey(logicalKey);
  const mem = String(member);
  const r = await withRedis(async (client) => {
    await client.sAdd(rk, mem);
    await client.expire(rk, ttl);
    const n = await client.sCard(rk);
    return Number(n) || 0;
  });
  if (r.ok) return r.value;

  const now = Date.now();
  pruneMem(now);
  const expiresAt = now + ttl * 1000;
  let bucket = memDistinct.get(logicalKey);
  if (!bucket || bucket.expiresAt <= now) {
    bucket = { expiresAt, members: new Map(), windowTtlMs: ttl * 1000 };
    memDistinct.set(logicalKey, bucket);
  }
  bucket.expiresAt = expiresAt;
  bucket.members.set(mem, now);
  return bucket.members.size;
}

/**
 * Test-only: clear in-memory buckets.
 */
export function resetTestStore() {
  memCounters.clear();
  memDistinct.clear();
}

const DEFAULT_TTL = 120;

/**
 * Increments L6 velocity dimensions for one hosted-checkout attempt (hashed recipient only).
 * @param {{
 *   userId: string,
 *   ip: string | undefined,
 *   recipientPhoneHash: string | null,
 *   operatorKey: string | null | undefined,
 *   amountCents: number,
 *   idempotencyKey: string,
 *   ttlSeconds?: number,
 * }} p
 */
export async function incrementCheckoutVelocitySnapshot(p) {
  const ttl = p.ttlSeconds ?? DEFAULT_TTL;
  const ipk = normalizeIpForVelocityKey(p.ip);
  const userKey = `fraud:user:${p.userId}`;
  const ipKey = `fraud:ip:${ipk}`;

  const userCount = await incrementWindow(userKey, ttl);
  const ipCount = await incrementWindow(ipKey, ttl);

  let recipientKeyCount = 0;
  if (p.recipientPhoneHash) {
    const rk = `fraud:recipient:${p.recipientPhoneHash}`;
    recipientKeyCount = await incrementWindow(rk, ttl);
    const recipIpKey = `fraud:recipient:${p.recipientPhoneHash}:ip:${ipk}`;
    await incrementWindow(recipIpKey, ttl);
  }

  let operatorIpCount = 0;
  if (p.operatorKey) {
    const ok = normOperatorKey(p.operatorKey);
    const opKey = `fraud:operator:${ok}:ip:${ipk}`;
    operatorIpCount = await incrementWindow(opKey, ttl);
  }

  const amtKey = `fraud:amount:${p.amountCents}:ip:${ipk}`;
  const amountIpCount = await incrementWindow(amtKey, ttl);

  let distinctRecipientsOnIp = 0;
  if (p.recipientPhoneHash) {
    const setKey = `fraud:ip_distinct_recipients:${ipk}`;
    distinctRecipientsOnIp = await addDistinctToWindow(
      setKey,
      p.recipientPhoneHash,
      ttl,
    );
  }

  const rotKey = `fraud:idempotency_rotation:${p.userId}`;
  const distinctIdempotencyKeys = await addDistinctToWindow(
    rotKey,
    p.idempotencyKey,
    ttl,
  );

  return {
    userCount,
    ipCount,
    recipientKeyCount,
    operatorIpCount,
    amountIpCount,
    distinctRecipientsOnIp,
    distinctIdempotencyKeys,
  };
}
