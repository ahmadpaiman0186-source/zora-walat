/**
 * Root Vercel deployment bridge for POST /webhooks/stripe.
 *
 * These tests prove the repo-root deployment declares the webhook route and
 * delegates to the existing slim Stripe webhook path without touching money
 * state when the signature gate fails closed.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import Stripe from 'stripe';

import rootWebhookHandler from '../../api/webhooks/stripe.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function makeReq(method, url, body = '', headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const stream = Readable.from(buf.length > 0 ? [buf] : [], {
    objectMode: false,
  });
  stream.method = method;
  stream.url = url;
  stream.headers = {
    'content-type': 'application/json',
    ...headers,
  };
  stream.httpVersion = '1.1';
  stream.httpVersionMajor = 1;
  stream.httpVersionMinor = 1;
  return /** @type {import('http').IncomingMessage} */ (
    /** @type {unknown} */ (stream)
  );
}

function makeMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
    setHeader(key, val) {
      this.headers[String(key).toLowerCase()] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.body = JSON.stringify(payload);
      this.ended = true;
      return this;
    },
    end(data) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        this.body = typeof data === 'string' ? data : data.toString('utf8');
      }
      this.ended = true;
    },
  };
}

function readRootVercelJson() {
  return JSON.parse(readFileSync(join(repoRoot, 'vercel.json'), 'utf8'));
}

describe('root Vercel webhook route declaration', () => {
  it('rewrites /webhooks/stripe and L-84ZJ health/ready probes to root serverless bridges', () => {
    const cfg = readRootVercelJson();
    assert.deepEqual(cfg.rewrites, [
      {
        source: '/webhooks/stripe',
        destination: '/api/webhooks/stripe',
      },
      {
        source: '/health',
        destination: '/api/health-ready?route=health',
      },
      {
        source: '/api/health',
        destination: '/api/health-ready?route=health',
      },
      {
        source: '/ready',
        destination: '/api/health-ready?route=ready',
      },
      {
        source: '/api/ready',
        destination: '/api/health-ready?route=ready',
      },
      {
        source: '/create-checkout-session',
        destination: '/api/create-checkout-session',
      },
      {
        source: '/ops/db-readonly-proof',
        destination: '/api/ops/db-readonly-proof',
      },
      {
        source: '/ops/health',
        destination: '/api/ops/health',
      },
    ]);
    assert.match(
      cfg.installCommand,
      /npm --prefix server install --include=dev/,
      'root deploy must install server dependencies used by the bridge',
    );
  });

  it('keeps existing frontend route files available', () => {
    for (const routeFile of [
      'app/page.tsx',
      'app/history/page.tsx',
      'app/success/page.tsx',
      'app/cancel/page.tsx',
    ]) {
      assert.equal(existsSync(join(repoRoot, routeFile)), true, `${routeFile} exists`);
    }
  });
});

describe('root Vercel webhook bridge handler', () => {
  it('fails closed for unsupported methods', async () => {
    const req = makeReq('GET', '/webhooks/stripe');
    const res = makeMockRes();
    await rootWebhookHandler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'POST');
  });

  it('fails closed for missing Stripe-Signature without invoking money handlers', async () => {
    let invoked = false;
    globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl = async () => {
      invoked = true;
      throw new Error('must_not_invoke_money_path');
    };
    try {
      const req = makeReq('POST', '/webhooks/stripe', '{}');
      const res = makeMockRes();
      await rootWebhookHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(invoked, false);
    } finally {
      delete globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl;
    }
  });

  it('delegates valid checkout.session.expired events to existing slim handler path', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_'),
      'setupTestEnv must provide synthetic STRIPE_WEBHOOK_SECRET',
    );

    const payload = JSON.stringify({
      id: `evt_root_exp_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: `cs_root_exp_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    let invoked = false;
    globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl = async () => {
      invoked = true;
      return {
        status: 'cancelled',
        stateTransition: 'pending_to_cancelled',
        latencyMs: 5,
      };
    };

    try {
      const req = makeReq('POST', '/webhooks/stripe', payload, {
        'stripe-signature': header,
      });
      const res = makeMockRes();
      await rootWebhookHandler(req, res);
      assert.equal(invoked, true);
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.received, true);
      assert.equal(body.path, 'slim_checkout_session_expired');
    } finally {
      delete globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl;
    }
  });
});
