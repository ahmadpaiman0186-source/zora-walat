import { createHash } from 'node:crypto';

/**
 * Stable hash over server-trusted fields (idempotency replay must match this).
 * Includes authenticated app user id so replays cannot cross accounts.
 */
export function checkoutRequestFingerprint({
  userId,
  amountUsdCents,
  operatorKey,
  recipientNational,
  packageId,
}) {
  const payload = JSON.stringify({
    u: userId,
    a: amountUsdCents,
    o: operatorKey ?? null,
    p: packageId ?? null,
    ph: recipientNational ?? null,
  });
  return createHash('sha256').update(payload).digest('hex');
}
