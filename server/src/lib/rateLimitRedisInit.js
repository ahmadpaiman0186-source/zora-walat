/**
 * Optional Redis-backed stores for express-rate-limit (multi-instance safety).
 * Initialized from `server/bootstrap.js` before `app.js` loads.
 *
 * **Observability:** {@link getHttpRateLimitSnapshot} surfaces effective store for `/ready`
 * (see `launchSubsystemSnapshot`).
 *
 * When Redis is disabled, unavailable, or init has not run, HTTP limiters use in-memory
 * Maps per process (`effectiveHttpRateStore: memory`).
 */
import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';

import { env } from '../config/env.js';

/** @type {import('redis').RedisClientType | null} */
let dedicatedClient = null;

/** @type {((args: string[]) => Promise<unknown>) | null} */
let sendCommandFn = null;

/** @type {Promise<{ ok: boolean, mode: string, error?: string }> | null} */
let initOnce = null;

/**
 * Secret-free snapshot after HTTP rate-limit store init (for `/ready`, operators).
 * @type {{
 *   initMode: string,
 *   rateLimitUseRedisEnv: boolean,
 *   redisUrlConfigured: boolean,
 *   effectiveHttpRateStore: 'redis' | 'memory',
 *   redisKeyPrefixPattern: string,
 *   memoryFallbackReason?: string,
 * } | null}
 */
let httpRateLimitOpsSnapshot = null;

/**
 * @returns {object} Snapshot for readiness payloads; never includes Redis URL or secrets.
 */
export function getHttpRateLimitSnapshot() {
  if (httpRateLimitOpsSnapshot) return httpRateLimitOpsSnapshot;
  return {
    initMode: 'pending',
    rateLimitUseRedisEnv: env.rateLimitUseRedis,
    redisUrlConfigured: Boolean(env.redisUrl),
    effectiveHttpRateStore: 'unknown',
    redisKeyPrefixPattern: 'rl:zora:*',
  };
}

function recordHttpRateLimitSnapshot(mode, effectiveStore, extra = {}) {
  httpRateLimitOpsSnapshot = {
    initMode: mode,
    rateLimitUseRedisEnv: env.rateLimitUseRedis,
    redisUrlConfigured: Boolean(env.redisUrl),
    effectiveHttpRateStore: effectiveStore,
    redisKeyPrefixPattern: 'rl:zora:*',
    ...extra,
  };
}

/**
 * Connect a dedicated Redis client for rate limiting (separate from `getRedisClient()`
 * fail-open path so limiters keep consistent behavior when app Redis is degraded).
 * Idempotent: safe to call from bootstrap for every process that loads app code after dotenv.
 */
export function initRateLimitRedisOptional() {
  if (!initOnce) {
    initOnce = runInitRateLimitRedis();
  }
  return initOnce;
}

async function runInitRateLimitRedis() {
  if (process.env.NODE_ENV === 'test') {
    recordHttpRateLimitSnapshot('skipped_test_env', 'memory');
    return { ok: true, mode: 'skipped_test_env' };
  }
  if (!env.rateLimitUseRedis || !env.redisUrl) {
    recordHttpRateLimitSnapshot('memory_default', 'memory');
    return { ok: true, mode: 'memory_default' };
  }

  try {
    const c = createClient({
      url: env.redisUrl,
      socket: {
        connectTimeout: env.redisConnectTimeoutMs,
        reconnectStrategy: false,
      },
    });
    c.on('error', () => {});
    await c.connect();
    dedicatedClient = c;
    sendCommandFn = (args) => c.sendCommand(args);
    recordHttpRateLimitSnapshot('redis', 'redis');
    console.log(
      '[startup] rate_limit_store=redis effectiveHttpRateStore=redis redisKeyPrefixPattern=rl:zora:*',
    );
    return { ok: true, mode: 'redis' };
  } catch (e) {
    dedicatedClient = null;
    sendCommandFn = null;
    const msg = String(e?.message ?? e);
    recordHttpRateLimitSnapshot('memory_fallback', 'memory', {
      memoryFallbackReason: msg.slice(0, 500),
    });
    console.warn(
      '[startup] rate_limit_store=memory_fallback effectiveHttpRateStore=memory Redis connection for rate limits failed (per-process buckets only)',
      msg,
    );
    return { ok: false, mode: 'memory_fallback', error: msg };
  }
}

/**
 * @param {string} prefix Unique per limiter (e.g. `wallet_topup_15m`)
 * @returns {import('express-rate-limit').LegacyStore | undefined}
 */
export function rateLimitRedisStore(prefix) {
  if (!sendCommandFn) return undefined;
  const safe = String(prefix ?? 'default').replace(/[^a-z0-9_-]/gi, '_').slice(0, 64);
  return new RedisStore({
    prefix: `rl:zora:${safe}:`,
    sendCommand: (...args) => sendCommandFn(args),
  });
}
