/**
 * Fast Stripe Checkout return pages (GET /success, GET /cancel) without bootstrap/Express.
 */
import { parseCheckoutReturnQuery } from '../src/lib/checkoutRedirectUrls.js';

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
</style>
</head>
<body>${inner}</body>
</html>`;
}

/**
 * @param {string} url
 */
function pathnameFromUrl(url) {
  const q = String(url ?? '').indexOf('?');
  let p = q === -1 ? String(url ?? '') : String(url ?? '').slice(0, q);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSlimCheckoutReturnGet(req, res) {
  const t0 = Date.now();
  const path = pathnameFromUrl(req.url ?? '');
  const qIdx = String(req.url ?? '').indexOf('?');
  const queryString = qIdx >= 0 ? String(req.url).slice(qIdx + 1) : '';
  const query = Object.fromEntries(new URLSearchParams(queryString));

  if (path === '/success') {
    const { sessionId, orderId, hasSessionId, hasOrderId } = parseCheckoutReturnQuery(query);
    const warnBlock =
      !hasSessionId || !hasOrderId
        ? `<p class="muted">Return params may be incomplete; webhooks finalize payment state.</p>`
        : '';
    const sessionSuffix =
      sessionId && sessionId.length >= 8 ? `…${sessionId.slice(-8)}` : '—';
    const orderSuffix =
      orderId && orderId.length >= 8 ? `…${orderId.slice(-8)}` : '—';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      htmlShell(
        'Payment successful',
        `<h1 class="ok">Payment successful</h1>
${warnBlock}
<p>Stripe Checkout completed. Order status updates via webhook.</p>
<p class="muted">Session ref: <code>${escapeHtml(sessionSuffix)}</code></p>
<p class="muted">Order ref: <code>${escapeHtml(orderSuffix)}</code></p>`,
      ),
    );
    console.log(
      JSON.stringify({
        event: 'checkout_return_slim_success',
        schema: 'zora.checkout_return_slim.v1',
        latencyMs: Date.now() - t0,
        t: new Date().toISOString(),
      }),
    );
    return;
  }

  if (path === '/cancel') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      htmlShell(
        'Checkout cancelled',
        `<h1>Checkout cancelled</h1>
<p>You left Stripe Checkout before completing payment.</p>`,
      ),
    );
    console.log(
      JSON.stringify({
        event: 'checkout_return_slim_cancel',
        schema: 'zora.checkout_return_slim.v1',
        latencyMs: Date.now() - t0,
        t: new Date().toISOString(),
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end('Not found');
}
