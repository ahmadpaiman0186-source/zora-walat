import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STRIPE_CHECKOUT_SESSION_ID_PLACEHOLDER,
  buildStripeCheckoutReturnUrls,
  checkoutRedirectLocalDiagnosticCode,
  parseCheckoutReturnQuery,
  tryParseHttpOriginPort,
  LOCAL_WEB_APP_DEFAULT_PORT,
} from '../src/lib/checkoutRedirectUrls.js';

describe('buildStripeCheckoutReturnUrls', () => {
  it('builds success_url with Stripe session placeholder and encoded order id', () => {
    const { successUrl, cancelUrl, successPath, cancelPath } = buildStripeCheckoutReturnUrls(
      'http://localhost:3000/',
      'ord_abc',
    );
    assert.equal(successPath, '/success');
    assert.equal(cancelPath, '/cancel');
    assert.equal(
      successUrl,
      `http://localhost:3000/success?session_id=${STRIPE_CHECKOUT_SESSION_ID_PLACEHOLDER}&order_id=${encodeURIComponent('ord_abc')}`,
    );
    assert.equal(cancelUrl, 'http://localhost:3000/cancel');
    assert.match(successUrl, /\{CHECKOUT_SESSION_ID\}/);
  });

  it('strips trailing slash on client base', () => {
    const { successUrl, cancelUrl } = buildStripeCheckoutReturnUrls('https://app.example.com/', 'x');
    assert.ok(successUrl.startsWith('https://app.example.com/success?'));
    assert.equal(cancelUrl, 'https://app.example.com/cancel');
  });
});

describe('parseCheckoutReturnQuery', () => {
  it('parses string query params', () => {
    const r = parseCheckoutReturnQuery({ session_id: 'cs_x', order_id: 'o1' });
    assert.equal(r.sessionId, 'cs_x');
    assert.equal(r.orderId, 'o1');
    assert.equal(r.hasSessionId, true);
    assert.equal(r.hasOrderId, true);
  });

  it('treats missing params as empty', () => {
    const r = parseCheckoutReturnQuery({});
    assert.equal(r.hasSessionId, false);
    assert.equal(r.hasOrderId, false);
  });
});

describe('tryParseHttpOriginPort', () => {
  it('reads explicit ports', () => {
    assert.equal(tryParseHttpOriginPort('http://localhost:3000'), 3000);
    assert.equal(tryParseHttpOriginPort('http://127.0.0.1:8787'), 8787);
  });
});

describe('checkoutRedirectLocalDiagnosticCode', () => {
  it('returns null for production', () => {
    assert.equal(
      checkoutRedirectLocalDiagnosticCode({
        nodeEnv: 'production',
        clientBase: 'http://localhost:3001',
        source: 'origin',
      }),
      null,
    );
  });

  it('returns null when origin matches default local web port', () => {
    assert.equal(
      checkoutRedirectLocalDiagnosticCode({
        nodeEnv: 'development',
        clientBase: `http://localhost:${LOCAL_WEB_APP_DEFAULT_PORT}`,
        source: 'origin',
      }),
      null,
    );
  });

  it('flags legacy 3001 vs 3000 mismatch', () => {
    assert.equal(
      checkoutRedirectLocalDiagnosticCode({
        nodeEnv: 'development',
        clientBase: 'http://localhost:3001',
        source: 'origin',
      }),
      'local_origin_port_3001_expect_3000',
    );
  });

  it('does not flag CLIENT_URL fallback on server port', () => {
    assert.equal(
      checkoutRedirectLocalDiagnosticCode({
        nodeEnv: 'development',
        clientBase: 'http://127.0.0.1:8787',
        source: 'client_url_fallback',
      }),
      null,
    );
  });
});
