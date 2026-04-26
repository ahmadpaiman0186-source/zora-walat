/**
 * Authoritative money-path route policy for Zora-Walat HTTP API (Sprint 2).
 * Keep in sync with `src/app.js` mounts and route files — used for audits and tests.
 *
 * Semantics:
 * - `anonymousAllowed`: true if the route does not require `Authorization: Bearer`.
 * - `authRequired`: true if a valid JWT must be present (401 otherwise).
 * - `emailVerifiedRequired`: true if `requireEmailVerified` applies when authenticated.
 * - `capabilityNotes`: non-secret proof required (session key header/body, Stripe signature, etc.).
 */

/** @typedef {{ method: string, path: string, anonymousAllowed: boolean, authRequired: boolean, emailVerifiedRequired: boolean, capabilityNotes: string }} MoneyRoutePolicyRow */

/** @type {MoneyRoutePolicyRow[]} */
export const MONEY_ROUTE_POLICY = Object.freeze([
  {
    method: 'POST',
    path: '/create-payment-intent',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Embedded PI: optional Bearer decorates Stripe metadata unless OWNER_ALLOWED_EMAIL is set (then Bearer required for allowed owner). When body.orderId is set, X-ZW-WebTopup-Session must match the order sessionKey (timing-safe). Idempotency-Key required. 503+payments_lockdown when PAYMENTS_LOCKDOWN_MODE; PRELAUNCH_LOCKDOWN first.',
  },
  {
    method: 'POST',
    path: '/create-checkout-session',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: true,
    capabilityNotes:
      'Authenticated catalog checkout; Idempotency-Key required. 503+payments_lockdown when PAYMENTS_LOCKDOWN_MODE; PRELAUNCH_LOCKDOWN first.',
  },
  {
    method: 'POST',
    path: '/checkout-pricing-quote',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Public pricing preview (IP rate-limited). Same JSON body as hosted checkout; returns pricingBreakdown without Stripe session. Flutter uses POST /api/checkout-pricing-quote.',
  },
  {
    method: 'POST',
    path: '/api/checkout-pricing-quote',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Same handler as POST /checkout-pricing-quote; primary path for clients scoped to /api/*.',
  },
  {
    method: 'POST',
    path: '/api/topup-orders',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Web marketing top-up: optional Bearer binds userId unless OWNER_ALLOWED_EMAIL is set (then Bearer required). Idempotency-Key required; sessionKey optional UUID. Entire `/api/topup-orders` tree returns 503 when PRELAUNCH_LOCKDOWN=true.',
  },
  {
    method: 'GET',
    path: '/api/topup-orders',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'List: query sessionKey (capability) and/or Bearer for bound-user list — at least one required. Returns 503 when PRELAUNCH_LOCKDOWN=true.',
  },
  {
    method: 'GET',
    path: '/api/topup-orders/:id',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Read: query sessionKey and/or Bearer (JWT recovery for user-bound orders). Wrong proof → 404 (no existence leak). Returns 503 when PRELAUNCH_LOCKDOWN=true.',
  },
  {
    method: 'POST',
    path: '/api/topup-orders/:id/mark-paid',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Client confirmation path (duplicates webhook authority when WEBTOPUP_CLIENT_MARK_PAID_ENABLED): requires updateToken + paymentIntentId + sessionKey OR Bearer matching bound userId; Stripe PI verified server-side. Returns 503 when PRELAUNCH_LOCKDOWN=true.',
  },
  {
    method: 'GET',
    path: '/api/wallet/balance',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: false,
    capabilityNotes: 'Wallet balance for authenticated user.',
  },
  {
    method: 'POST',
    path: '/api/wallet/topup',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: true,
    capabilityNotes: 'Wallet Stripe top-up; prelaunch may block via middleware.',
  },
  {
    method: 'POST',
    path: '/api/recharge/quote',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: false,
    capabilityNotes: 'Authenticated quote only.',
  },
  {
    method: 'POST',
    path: '/api/recharge/order',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: true,
    capabilityNotes: 'Creates recharge order; prelaunch may block.',
  },
  {
    method: 'POST',
    path: '/api/recharge/execute',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: true,
    capabilityNotes:
      'Post-payment fulfillment kick; blocked under PRELAUNCH_LOCKDOWN via blockMoneyRoutesIfPrelaunch.',
  },
  {
    method: 'GET',
    path: '/api/orders',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: false,
    capabilityNotes: 'Legacy Reloadly / operator orders list (JWT).',
  },
  {
    method: 'GET',
    path: '/api/orders/*',
    anonymousAllowed: false,
    authRequired: true,
    emailVerifiedRequired: false,
    capabilityNotes: 'Legacy order reads (JWT).',
  },
  {
    method: 'POST',
    path: '/webhooks/stripe',
    anonymousAllowed: true,
    authRequired: false,
    emailVerifiedRequired: false,
    capabilityNotes:
      'Stripe signing secret + raw body; primary payment authority for captured funds (web top-up + wallet + legacy checkout per handler).',
  },
]);

/**
 * Stable text report for operators / CI (no secrets).
 * @returns {string}
 */
export function formatMoneyRoutePolicyReport() {
  const lines = [
    'Money route policy (HTTP)',
    'path | anonymous | auth | verified | notes',
    '---|---|---|---|---',
  ];
  for (const r of MONEY_ROUTE_POLICY) {
    lines.push(
      `${r.method} ${r.path} | ${r.anonymousAllowed} | ${r.authRequired} | ${r.emailVerifiedRequired} | ${r.capabilityNotes}`,
    );
  }
  return lines.join('\n');
}
