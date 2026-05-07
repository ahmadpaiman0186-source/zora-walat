/**
 * Broad /api rate limit (excludes webhooks — they mount outside /api).
 * Stacks with route-specific limiters; keeps anonymous /api abuse bounded.
 */
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { clientIpKey } from './rateLimits.js';

/**
 * @param {import('express').Request} req
 */
function skipHealth(req) {
  return req.method === 'GET' && (req.path === '/health' || req.path === '');
}

const isTestOrCi = env.nodeEnv === 'test' || process.env.CI === 'true';

export const apiEdgeLimiter = rateLimit({
  windowMs: 60_000,
  max: isTestOrCi ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  skip: skipHealth,
  ...(isTestOrCi ? { validate: false } : {}),
});
