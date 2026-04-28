import { createHash } from 'node:crypto';

/**
 * Digits-only phone for storage and dedup (max 20 chars).
 * @param {string} raw
 */
export function normalizeTopupPhone(raw) {
  if (typeof raw !== 'string') return '';
  const d = raw.replace(/\D/g, '').slice(0, 20);
  return d;
}

/**
 * Server-side string trim / bound length for catalog text fields.
 * @param {string} s
 * @param {number} max
 */
export function sanitizeBoundedString(s, max) {
  if (typeof s !== 'string') return '';
  return s.trim().slice(0, max);
}

/**
 * Stable request fingerprint for idempotent POST /api/topup-orders (sha256 hex).
 * @param {object} p
 */
export function computeTopupOrderPayloadHash(p) {
  const canonical = {
    sessionKey: p.sessionKey ?? null,
    /** Distinguishes anonymous vs authenticated idempotent creates (same idempotency key + different binding → 409). */
    boundUserId: p.boundUserId ?? null,
    originCountry: String(p.originCountry ?? '').toUpperCase(),
    destinationCountry: String(p.destinationCountry ?? '').toUpperCase(),
    productType: p.productType,
    operatorKey: p.operatorKey,
    operatorLabel: p.operatorLabel,
    phoneNumber: p.phoneNumber,
    productId: p.productId,
    productName: p.productName,
    selectedAmountLabel: p.selectedAmountLabel,
    amountCents: Number(p.amountCents),
    currency: String(p.currency ?? 'usd').toLowerCase(),
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex');
}
