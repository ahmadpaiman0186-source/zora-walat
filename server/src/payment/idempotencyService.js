/**
 * Layer 3 — idempotency helpers for hosted checkout.
 *
 * **Persistence:** `PaymentCheckout.idempotencyKey` (client `Idempotency-Key` UUID, UNIQUE),
 * `requestFingerprint` (SHA-256 of trusted fields), row status + Stripe URLs — see `paymentCheckoutService`.
 *
 * **Logical key (optional):** deterministic hash for diagnostics / future server-side bucketing;
 * it does **not** replace the client UUID idempotency contract.
 */

import { createHash } from 'node:crypto';

import { checkoutRequestFingerprint } from '../lib/checkoutFingerprint.js';
import {
  findReusableCheckout,
  getCheckoutByIdempotencyKey,
} from '../services/paymentCheckoutService.js';

/**
 * Same canonical hash as checkout replay (`checkoutRequestFingerprint`).
 * @param {Parameters<typeof checkoutRequestFingerprint>[0]} input
 */
export function computeHostedCheckoutRequestHash(input) {
  return checkoutRequestFingerprint(input);
}

/**
 * Optional logical key: user + amount + phone + operator + coarse time bucket (no secrets).
 * @param {{
 *   userId: string,
 *   amountCents: number,
 *   recipientNational: string | null,
 *   operatorKey: string | null,
 *   timestampBucketMs?: number,
 * }} p
 */
export function computeLogicalPaymentDedupeKey(p) {
  const bucket =
    typeof p.timestampBucketMs === 'number' && Number.isFinite(p.timestampBucketMs)
      ? p.timestampBucketMs
      : Math.floor(Date.now() / 60_000) * 60_000;
  const payload = JSON.stringify({
    u: p.userId,
    a: p.amountCents,
    ph: p.recipientNational ?? '',
    o: p.operatorKey ?? '',
    b: bucket,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * @param {Parameters<typeof findReusableCheckout>[0]} params
 */
export async function tryReuseHostedCheckoutSession(params) {
  return findReusableCheckout(params);
}

/**
 * @param {string} idempotencyKey
 */
export async function getHostedCheckoutByIdempotencyKey(idempotencyKey) {
  return getCheckoutByIdempotencyKey(idempotencyKey);
}

/**
 * Structured observability for safe replays (never log full idempotency secrets).
 * @param {{ info?: Function, warn?: Function }} log
 * @param {{ idempotencyKey: string, orderId: string, traceId?: string | null }} p
 */
export function logIdempotencyReplayHit(log, p) {
  const key = String(p.idempotencyKey ?? '');
  const keyPrefix = key.length > 12 ? `${key.slice(0, 8)}…` : key;
  log?.info?.(
    {
      event: 'idempotency_hit',
      key: keyPrefix,
      orderId: p.orderId,
      traceId: p.traceId ?? null,
    },
    'payment_core',
  );
}
