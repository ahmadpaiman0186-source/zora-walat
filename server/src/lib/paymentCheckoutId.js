/**
 * Prisma `cuid()` ids are lowercase alphanumeric; reject odd metadata to limit probing.
 */
export function isLikelyPaymentCheckoutId(value) {
  return typeof value === 'string' && /^[a-z0-9]{20,36}$/.test(value);
}
