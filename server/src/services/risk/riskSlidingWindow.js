/**
 * In-process sliding-window counters for abuse detection (per API instance).
 * Complements Redis-backed express-rate-limit when REDIS_URL is set.
 */

/** @type {Map<string, { resetAt: number, count: number }>} */
const buckets = new Map();

const MAX_KEYS = 50_000;

function pruneIfNeeded() {
  if (buckets.size <= MAX_KEYS) return;
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

/**
 * Increment counter for key; reset window if expired.
 * @returns {{ count: number, resetAt: number }}
 */
export function incrementSlidingWindow(key, windowMs) {
  pruneIfNeeded();
  const now = Date.now();
  const k = String(key).slice(0, 256);
  let b = buckets.get(k);
  if (!b || b.resetAt <= now) {
    b = { resetAt: now + windowMs, count: 0 };
    buckets.set(k, b);
  }
  b.count += 1;
  return { count: b.count, resetAt: b.resetAt };
}

/**
 * @returns {number} current count without incrementing (0 if expired)
 */
export function peekSlidingWindow(key, windowMs) {
  const now = Date.now();
  const k = String(key).slice(0, 256);
  const b = buckets.get(k);
  if (!b || b.resetAt <= now) return 0;
  return b.count;
}

/** Test helper */
export function clearSlidingWindowsForTests() {
  buckets.clear();
}
