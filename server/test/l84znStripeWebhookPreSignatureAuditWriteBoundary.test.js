/**
 * L-84ZN — Stripe webhook pre-signature audit-write boundary (local mocks only).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, it } from 'node:test';
import { Readable } from 'node:stream';

import Stripe from 'stripe';

import rootWebhookHandler from '../../api/webhooks/stripe.mjs';
import { handleSlimStripeWebhookPost } from '../handlers/slimStripeWebhookHandler.mjs';

function makeStripeWebhookReq(body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/webhooks/stripe';
  stream.headers = {
    'content-type': 'application/json',
    ...headers,
  };
  stream.httpVersion = '1.1';
  stream.httpVersionMajor = 1;
  stream.httpVersionMinor = 1;
  return /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (stream));
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

function installAuditSpy() {
  const records = [];
  globalThis.__zwStripeWebhookAuditAdapter = async (record) => {
    records.push(record);
  };
  return records;
}

afterEach(() => {
  delete globalThis.__zwStripeWebhookAuditAdapter;
  delete globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl;
  delete globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl;
});

describe('L-84ZN pre-signature audit-write boundary', () => {
  it('missing Stripe-Signature: 400, no audit write, no getHandler, no payment mock', async () => {
    const records = installAuditSpy();
    let handlerCalls = 0;
    let paymentMockCalls = 0;
    globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl = async () => {
      paymentMockCalls += 1;
      return { status: 'paid', stateTransition: 'pending_to_paid', latencyMs: 1 };
    };
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };

    const req = makeStripeWebhookReq('{}');
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);

    assert.equal(res.statusCode, 400);
    assert.equal(handlerCalls, 0);
    assert.equal(paymentMockCalls, 0);
    assert.equal(records.length, 0);
    assert.equal(res.body.includes('cs_'), false);
    assert.equal(res.body.includes('pi_'), false);
  });

  it('invalid Stripe-Signature: 400, no audit write, no getHandler, no payment mock', async () => {
    const records = installAuditSpy();
    let handlerCalls = 0;
    let paymentMockCalls = 0;
    globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl = async () => {
      paymentMockCalls += 1;
      return { status: 'paid', stateTransition: 'pending_to_paid', latencyMs: 1 };
    };
    const payload = JSON.stringify({
      id: `evt_l84zn_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { object: 'checkout.session', metadata: {} } },
    });
    const badHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: `whsec_${'x'.repeat(32)}`,
    });
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };

    const req = makeStripeWebhookReq(payload, { 'stripe-signature': badHeader });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);

    assert.equal(res.statusCode, 400);
    assert.equal(handlerCalls, 0);
    assert.equal(paymentMockCalls, 0);
    assert.equal(records.length, 0);
  });

  it('valid signature: audit telemetry after verification and mocked slim handler path', async () => {
    const records = installAuditSpy();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(typeof secret === 'string' && secret.startsWith('whsec_'));

    const payload = JSON.stringify({
      id: `evt_l84zn_ok_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: `cs_l84zn_ok_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl = async () => ({
      status: 'cancelled',
      stateTransition: 'pending_to_cancelled',
      latencyMs: 3,
    });

    const getHandler = async () => () => {};
    const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);

    assert.equal(res.statusCode, 200);
    assert.ok(records.length > 0, 'verified path may record audit telemetry');
    assert.ok(
      records.every((r) => r.signature_verification_status === 'verified'),
      'audit only after signature verification',
    );
    assert.ok(records.some((r) => r.handler_stage === 'response_sent'));
  });

  it('root bridge GET returns 405 before audit write', async () => {
    const records = installAuditSpy();
    const req = makeStripeWebhookReq('');
    req.method = 'GET';
    const res = makeMockRes();
    await rootWebhookHandler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(records.length, 0);
  });

  it('root bridge HEAD returns 405 before audit write', async () => {
    const records = installAuditSpy();
    const req = makeStripeWebhookReq('');
    req.method = 'HEAD';
    const res = makeMockRes();
    await rootWebhookHandler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(records.length, 0);
  });

  it('signing secret not configured: 503 without audit write', async () => {
    const records = installAuditSpy();
    const prev = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = '';
    try {
      const getHandler = async () => () => {};
      const req = makeStripeWebhookReq('{}', { 'stripe-signature': 't=1,v1=aa' });
      const res = makeMockRes();
      await handleSlimStripeWebhookPost(req, res, getHandler);
      assert.equal(res.statusCode, 503);
      assert.equal(records.length, 0);
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = prev;
    }
  });
});
