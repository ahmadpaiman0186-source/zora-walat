/** Mask order/session identifiers for customer-facing UI (suffix only). */
export function maskPublicRef(raw: string): string {
  const id = String(raw ?? '').trim();
  if (id.length < 4) return '';
  if (id.length <= 8) return `…${id.slice(-4)}`;
  return `…${id.slice(-6)}`;
}

export function readSearchParam(
  value: string | string[] | undefined,
): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return '';
}

/** Read-only: map server top-up paymentStatus to safe UI phase. */
export function classifyTopupPaymentStatus(
  paymentStatus: string | undefined,
): 'confirmed' | 'pending' | 'failed' | 'unknown' {
  const s = String(paymentStatus ?? '')
    .trim()
    .toUpperCase();
  if (s === 'PAID' || s === 'SUCCEEDED' || s === 'PAYMENT_SUCCEEDED') {
    return 'confirmed';
  }
  if (s === 'PENDING' || s === 'PAYMENT_PENDING') {
    return 'pending';
  }
  if (s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED') {
    return 'failed';
  }
  return 'unknown';
}
