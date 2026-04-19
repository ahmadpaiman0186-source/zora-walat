/**
 * Next.js client-only public configuration (NEXT_PUBLIC_*).
 * Centralizes reads so env usage stays explicit and grep-friendly.
 */

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
}

export function getPublicApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
}

/** Safe diagnostic: mode + length only (never log full key). */
export function describeStripePublishableKey(): {
  present: boolean;
  length: number;
  prefix: string;
} {
  const k = getStripePublishableKey();
  return {
    present: k.length > 0,
    length: k.length,
    prefix: k.slice(0, 12),
  };
}
