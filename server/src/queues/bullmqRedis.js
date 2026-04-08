/**
 * Dedicated ioredis connection factory for BullMQ.
 * Separate from `redisClient.js` (node-redis + fail-safe checkout paths).
 */
import Redis from 'ioredis';
import { env } from '../config/env.js';

/**
 * @returns {import('ioredis').default}
 */
export function createBullmqConnection() {
  const url =
    String(process.env.REDIS_URL ?? env.redisUrl ?? '').trim() ||
    'redis://127.0.0.1:6379';
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    connectTimeout: env.redisConnectTimeoutMs,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 100, 2000);
    },
  });
  client.on('connect', () => console.log('[redis] connected'));
  client.on('error', (err) => console.error('[redis] error', err));
  return client;
}
