import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string equality (UTF-8). Use for secrets (session keys, tokens).
 * @param {string} a
 * @param {string} b
 */
export function timingSafeEqualUtf8(a, b) {
  const x = Buffer.from(String(a ?? ''), 'utf8');
  const y = Buffer.from(String(b ?? ''), 'utf8');
  if (x.length !== y.length) return false;
  if (x.length === 0) return true;
  return timingSafeEqual(x, y);
}
