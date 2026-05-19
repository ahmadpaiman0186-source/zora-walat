/**
 * Secret-safe string helpers for zw-doctor output.
 */
import { buildRedactPatterns } from './secretPatterns.mjs';

const SECRET_PATTERNS = buildRedactPatterns();

/**
 * @param {string} text
 */
export function redactSecrets(text) {
  let out = String(text ?? '');
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, '[REDACTED]');
  }
  return out;
}

/**
 * @param {string} raw
 */
export function maskKeyPrefix(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '(none)';
  if (s.length <= 12) return `${s.slice(0, 4)}…`;
  return `${s.slice(0, 12)}…`;
}
