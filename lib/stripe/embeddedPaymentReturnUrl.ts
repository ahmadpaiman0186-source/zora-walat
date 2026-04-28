/**
 * Stripe.js `confirmPayment({ confirmParams: { return_url } })` requires an absolute
 * http(s) URL when the PaymentIntent can use redirect-capable payment methods.
 *
 * Prefer `NEXT_PUBLIC_STRIPE_RETURN_URL` in production for a stable post-redirect landing
 * (must match an allowed URL in Stripe Dashboard if you restrict return URLs).
 * Otherwise use the current page URL (localhost-friendly).
 */
export function getStripeEmbeddedPaymentReturnUrl(): string {
  if (typeof window === 'undefined') {
    throw new Error(
      'getStripeEmbeddedPaymentReturnUrl: must run in the browser (Payment Element submit)',
    );
  }

  const fromEnv = process.env.NEXT_PUBLIC_STRIPE_RETURN_URL?.trim();
  if (fromEnv) {
    const u = new URL(fromEnv);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error(
        'NEXT_PUBLIC_STRIPE_RETURN_URL must be an absolute http(s) URL',
      );
    }
    return u.toString();
  }

  const buildFromLocation = () => {
    const { origin, pathname, search, hash, href } = window.location;
    const raw =
      href && href !== 'about:blank'
        ? href
        : `${origin}${pathname}${search}${hash}`;
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('Stripe return_url requires an http(s) page URL');
    }
    return u.toString();
  };

  try {
    return buildFromLocation();
  } catch {
    const u = new URL(`${window.location.origin}/`);
    return u.toString();
  }
}
