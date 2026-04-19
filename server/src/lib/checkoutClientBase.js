function normalizeClientBase(raw) {
  return String(raw ?? '').trim().replace(/\/$/, '');
}

function validateClientBaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        ok: false,
        status: 400,
        error: 'Invalid checkout client URL scheme.',
      };
    }
    return { ok: true, clientBase: normalizeClientBase(url.toString()) };
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'Invalid checkout client URL.',
    };
  }
}

/**
 * Resolve the browser/app base URL used for Stripe Checkout success/cancel redirects.
 *
 * Production must use the configured CLIENT_URL. In non-production we prefer the
 * request Origin when present, but allow a configured CLIENT_URL fallback so native
 * clients and non-browser test harnesses do not fail on missing Origin headers.
 *
 * After resolution, `buildStripeCheckoutReturnUrls` in `checkoutRedirectUrls.js` is the
 * only place that should construct `success_url` / `cancel_url` for Phase 1 checkout.
 */
export function resolveCheckoutClientBase({ nodeEnv, clientUrl, origin }) {
  if (nodeEnv === 'production') {
    const normalized = normalizeClientBase(clientUrl);
    if (!normalized) {
      return {
        ok: false,
        status: 500,
        error: 'CLIENT_URL must be set in production for Stripe Checkout redirects.',
      };
    }
    const validated = validateClientBaseUrl(normalized);
    if (!validated.ok) {
      return validated;
    }
    return {
      ok: true,
      clientBase: validated.clientBase,
      source: 'client_url',
    };
  }

  const normalizedOrigin = normalizeClientBase(origin);
  if (normalizedOrigin) {
    const validated = validateClientBaseUrl(normalizedOrigin);
    if (!validated.ok) {
      return validated;
    }
    return {
      ok: true,
      clientBase: validated.clientBase,
      source: 'origin',
    };
  }

  const normalizedClientUrl = normalizeClientBase(clientUrl);
  if (normalizedClientUrl) {
    const validated = validateClientBaseUrl(normalizedClientUrl);
    if (!validated.ok) {
      return validated;
    }
    return {
      ok: true,
      clientBase: validated.clientBase,
      source: 'client_url_fallback',
    };
  }

  return {
    ok: false,
    status: 400,
    error:
      'Missing checkout client base URL. Send an Origin header or configure CLIENT_URL for non-browser flows.',
  };
}
