import { createHash } from 'node:crypto';

/**
 * Canonical provider request fingerprint (order fields only; no PII beyond digits).
 * @param {object} req
 */
export function hashNormalizedFulfillmentRequest(req) {
  const canonical = {
    orderId: req.orderId,
    destinationCountry: String(req.destinationCountry ?? '').toUpperCase(),
    productType: req.productType,
    operatorKey: req.operatorKey,
    phoneNationalDigits: String(req.phoneNationalDigits ?? '').replace(/\D/g, ''),
    productId: req.productId,
    amountCents: Number(req.amountCents),
    currency: String(req.currency ?? 'usd').toLowerCase(),
  };
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}
