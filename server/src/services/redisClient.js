import { env } from '../config/env.js';

let client = null;
let clientPromise = null;
let disabledUntilMs = 0;

function shouldAttemptRedis() {
  return Date.now() >= disabledUntilMs;
}

/**
 * Fail-safe Redis client getter.
 * - Returns `null` when Redis is not configured or temporarily unavailable.
 * - Never throws to the checkout flow.
 */
export async function getRedisClient() {
  if (!env.redisUrl) return null;
  if (!shouldAttemptRedis()) return null;
  if (client) return client;

  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod = await import('redis');
        const { createClient } = mod;
        const c = createClient({
          url: env.redisUrl,
          socket: {
            connectTimeout: env.redisConnectTimeoutMs,
            reconnectStrategy: () => 0, // fail fast; we handle fallback in code
          },
        });
        c.on('error', () => {
          // Avoid noisy logs; we surface availability via null returns below.
        });
        await c.connect();
        return c;
      } catch (err) {
        // Circuit-breaker: avoid hammering Redis on each request.
        disabledUntilMs = Date.now() + 10_000;
        client = null;
        return null;
      }
    })();
  }

  client = await clientPromise;
  clientPromise = null;
  return client;
}

/**
 * Executes a Redis callback with safe failure.
 * @template T
 * @param {(client: import('redis').RedisClientType) => Promise<T>} fn
 * @returns {Promise<{ ok: true, value: T } | { ok: false, error: string }>}
 */
export async function withRedis(fn) {
  const c = await getRedisClient();
  if (!c) return { ok: false, error: 'redis_unavailable' };
  try {
    const value = await fn(c);
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'redis_command_failed' };
  }
}

