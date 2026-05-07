import { createHash } from 'node:crypto';

export function sha256Hex(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

/**
 * Stable hash for velocity keys — never log raw national digits.
 * @param {string | null | undefined} recipientNationalDigits
 */
export function hashRecipientNationalForFraud(recipientNationalDigits) {
  const d = String(recipientNationalDigits ?? '').replace(/\D/g, '');
  if (d.length < 8) return null;
  return sha256Hex(`zw:recipient:v1:${d}`);
}

export function hashIpForLogSuffix(ip) {
  const raw = String(ip ?? '').trim() || '0.0.0.0';
  return sha256Hex(`zw:ip:v1:${raw}`);
}
