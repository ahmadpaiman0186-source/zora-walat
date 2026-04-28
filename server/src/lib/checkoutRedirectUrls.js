/**
 * Single ownership for Stripe Checkout `success_url` / `cancel_url` construction.
 *
 * Rules (do not duplicate string building elsewhere):
 * - `success_url` must include Stripe's literal `{CHECKOUT_SESSION_ID}` token (not URL-encoded).
 * - Query keys are fixed: `session_id`, `order_id` (must match Next `app/success/page.tsx` and API fallback HTML).
 * - `clientBase` must have no trailing slash (normalized).
 *
 * @see resolveCheckoutClientBase — supplies `clientBase` from Origin (dev) or CLIENT_URL (prod / fallback).
 */

/** Stripe replaces this exact substring in the success URL after payment. */
export const STRIPE_CHECKOUT_SESSION_ID_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';

/** Repo root Next.js dev default; used for diagnostics only (never forced in URLs). */
export const LOCAL_WEB_APP_DEFAULT_PORT = 3000;

function normalizeClientBase(raw) {
  return String(raw ?? '').trim().replace(/\/$/, '');
}

/**
 * @param {string} clientBase
 * @param {string} internalOrderId — PaymentCheckout / order row id (URL-encoded in query).
 * @returns {{ successUrl: string, cancelUrl: string, successPath: string, cancelPath: string }}
 */
export function buildStripeCheckoutReturnUrls(clientBase, internalOrderId) {
  const base = normalizeClientBase(clientBase);
  const orderParam = encodeURIComponent(internalOrderId);
  const successUrl = `${base}/success?session_id=${STRIPE_CHECKOUT_SESSION_ID_PLACEHOLDER}&order_id=${orderParam}`;
  const cancelUrl = `${base}/cancel`;
  return {
    successUrl,
    cancelUrl,
    successPath: '/success',
    cancelPath: '/cancel',
  };
}

/**
 * Parse Stripe redirect query params (Express `req.query` or similar).
 *
 * @param {object} query
 * @returns {{ sessionId: string, orderId: string, hasSessionId: boolean, hasOrderId: boolean }}
 */
export function parseCheckoutReturnQuery(query) {
  const q = query && typeof query === 'object' ? query : {};
  const sessionRaw = q.session_id;
  const orderRaw = q.order_id;
  const sessionId = typeof sessionRaw === 'string' ? sessionRaw : '';
  const orderId = typeof orderRaw === 'string' ? orderRaw : '';
  return {
    sessionId,
    orderId,
    hasSessionId: sessionId.length > 0,
    hasOrderId: orderId.length > 0,
  };
}

/**
 * @param {string} clientBase
 * @returns {number | null} — port number, or null if unparsable
 */
export function tryParseHttpOriginPort(clientBase) {
  try {
    const u = new URL(clientBase);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.port) return Number(u.port);
    return u.protocol === 'https:' ? 443 : 80;
  } catch {
    return null;
  }
}

/**
 * Dev-only hint: old repo default was 3001 while CORS/checkout assumed 3000 — log when Origin port looks mismatched.
 * Does not apply to production CLIENT_URL.
 *
 * @param {{ nodeEnv: string, clientBase: string, source: string }} args
 * @returns {string | null} — diagnostic code for structured logs, or null
 */
export function checkoutRedirectLocalDiagnosticCode(args) {
  if (args.nodeEnv === 'production') return null;
  if (args.source !== 'origin') return null;
  const port = tryParseHttpOriginPort(args.clientBase);
  if (port === null) return null;
  const host = (() => {
    try {
      return new URL(args.clientBase).hostname;
    } catch {
      return '';
    }
  })();
  const local = host === 'localhost' || host === '127.0.0.1';
  if (!local) return null;
  if (port === LOCAL_WEB_APP_DEFAULT_PORT) return null;
  /** Known foot-gun: Next was historically on 3001 while checkout smoke used 3000. */
  if (port === 3001) return 'local_origin_port_3001_expect_3000';
  return 'local_origin_non_default_port';
}
