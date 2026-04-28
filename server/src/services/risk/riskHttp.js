import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Stable key for risk counters (matches rate-limit IP keying).
 * @param {import('express').Request} req
 */
export function riskClientIpKey(req) {
  const raw = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const s = typeof raw === 'string' ? raw.replace(/^::ffff:/, '') : String(raw);
  return ipKeyGenerator(s);
}
