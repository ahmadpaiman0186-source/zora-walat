/**
 * Local / dev-only Stripe Checkout return pages.
 *
 * When `CLIENT_URL` or `Origin` resolves to this API origin (e.g. http://127.0.0.1:8787),
 * GET /success and GET /cancel must load after Stripe redirects — without a separate web app.
 * Production must use the real web app origin; these routes are not mounted in production.
 *
 * Query contract is owned by `buildStripeCheckoutReturnUrls` (paymentController) — keep `session_id` / `order_id` in sync.
 */
import express from 'express';

import { env } from '../config/env.js';
import { parseCheckoutReturnQuery } from '../lib/checkoutRedirectUrls.js';

const router = express.Router();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlShell(title, inner) {
  const t = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
  h1 { font-size: 1.35rem; }
  .ok { color: #0b6e0b; }
  .muted { color: #555; font-size: 0.9rem; }
  code { background: #f0f0f0; padding: 0.1rem 0.35rem; border-radius: 4px; word-break: break-all; }
  dl { margin: 1rem 0; }
  dt { font-weight: 600; margin-top: 0.5rem; }
  dd { margin: 0.15rem 0 0 0; }
</style>
</head>
<body>${inner}</body>
</html>`;
}

router.get('/success', (req, res) => {
  const { sessionId, orderId, hasSessionId, hasOrderId } = parseCheckoutReturnQuery(req.query);
  const missingStripe = !hasSessionId;
  const missingOrder = !hasOrderId;
  const warnBlock =
    missingStripe || missingOrder
      ? `<p style="background:#fff8e6;border:1px solid #e6a800;padding:.75rem;border-radius:6px">
<strong>Note:</strong> Expected query params from Stripe redirect are missing.
If you opened this URL manually, that is normal. If you returned from Checkout and see this, check that
<code>success_url</code> matches this host and that the redirect was not stripped.
</p>`
      : '';
  res
    .type('html')
    .send(
      htmlShell(
        'Payment successful',
        `<h1 class="ok">Payment successful</h1>
${warnBlock}
<p>Stripe Checkout completed. Webhooks will finalize the order in the API.</p>
<dl>
  <dt>Checkout session</dt>
  <dd><code>${escapeHtml(sessionId || '—')}</code></dd>
  <dt>Order</dt>
  <dd><code>${escapeHtml(orderId || '—')}</code></dd>
</dl>
<p class="muted">Zora-Walat local return page (non-production API). You can close this tab.</p>`,
      ),
    );
});

router.get('/cancel', (_req, res) => {
  res
    .type('html')
    .send(
      htmlShell(
        'Checkout cancelled',
        `<h1>Checkout cancelled</h1>
<p>You left Stripe Checkout before completing payment. No charge was made.</p>
<p class="muted">Zora-Walat local return page (non-production API).</p>`,
      ),
    );
});

/**
 * @param {import('express').Express} app
 */
export function mountCheckoutReturnRoutesIfNonProduction(app) {
  if (env.nodeEnv === 'production') return;
  app.use(router);
}
