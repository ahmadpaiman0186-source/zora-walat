/**
 * Slim serverless POST /webhooks/stripe: invalid/missing signature before bootstrap.
 * Preloaded: setupTestEnv.mjs (synthetic STRIPE_WEBHOOK_SECRET when unset).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';
import Stripe from 'stripe';

import {
  createStripeWebhookReplayStream,
  handleSlimStripeWebhookPost,
  stripeEventSlimUnmatchedFastAck,
  WEBHOOK_RAW_BODY_LIMIT_BYTES,
} from '../api/slimStripeWebhookHandler.mjs';
import { WEBTOPUP_STRIPE_PI_METADATA_SOURCE } from '../src/constants/webTopupStripePiMetadata.js';

/**
 * @param {Buffer | string} body
 * @param {Record<string, string | string[] | undefined>} [headers]
 */
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
    /** @type {Record<string, string | number | string[] | undefined>} */
    headers: {},
    body: '',
    ended: false,
    /**
     * @param {string} key
     * @param {string} val
     */
    setHeader(key, val) {
      this.headers[String(key).toLowerCase()] = val;
    },
    /**
     * @param {string | Buffer} [data]
     */
    end(data) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        this.body = typeof data === 'string' ? data : data.toString('utf8');
      }
      this.ended = true;
    },
  };
}

function assertNoSecretLeak(text) {
  const s = String(text ?? '');
  assert.ok(!s.includes('whsec_'), 'response must not contain whsec_');
  assert.ok(!/sk_live_/i.test(s), 'response must not contain sk_live_');
  assert.ok(!/rk_live_/i.test(s), 'response must not contain rk_live_');
}

describe('Slim Stripe webhook serverless entry (POST /webhooks/stripe)', () => {
  it('returns 400 quickly for missing Stripe-Signature without calling getHandler', async () => {
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const req = makeStripeWebhookReq('{}');
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimStripeWebhookPost(req, res, getHandler);
    const ms = Date.now() - t0;
    assert.equal(handlerCalls, 0, 'getHandler must not run for missing signature');
    assert.equal(res.statusCode, 400);
    assert.equal(res.ended, true);
    assert.ok(ms < 2000, `expected fast reject, took ${ms}ms`);
    assertNoSecretLeak(res.body);
    const j = JSON.parse(res.body);
    assert.equal(j.success, false);
    assert.equal(j.code, 'validation_error');
  });

  it('returns 400 quickly for invalid Stripe-Signature without calling getHandler', async () => {
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const payload = JSON.stringify({
      id: `evt_slim_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_slim_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: {},
        },
      },
    });
    const badHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: `whsec_${'z'.repeat(32)}`,
    });
    const req = makeStripeWebhookReq(payload, { 'stripe-signature': badHeader });
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimStripeWebhookPost(req, res, getHandler);
    const ms = Date.now() - t0;
    assert.equal(handlerCalls, 0);
    assert.equal(res.statusCode, 400);
    assert.ok(ms < 2000, `expected fast reject, took ${ms}ms`);
    assertNoSecretLeak(res.body);
  });

  it('returns 503 when signing secret is not configured, without calling getHandler', async () => {
    const prev = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = '';
    let handlerCalls = 0;
    try {
      const getHandler = async () => {
        handlerCalls += 1;
        return () => {};
      };
      const req = makeStripeWebhookReq('{}', { 'stripe-signature': 't=1,v1=ab' });
      const res = makeMockRes();
      await handleSlimStripeWebhookPost(req, res, getHandler);
      assert.equal(handlerCalls, 0);
      assert.equal(res.statusCode, 503);
      assertNoSecretLeak(res.body);
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = prev;
    }
  });

  it('processes checkout.session.completed on slim path without calling getHandler', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_') && secret.length >= 20,
      'STRIPE_WEBHOOK_SECRET must be usable (setupTestEnv)',
    );
    const internalCheckoutId = `c${'0123456789abcdefghijk'.slice(0, 23)}`;
    const payload = JSON.stringify({
      id: `evt_slim_ok_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_slim_ok_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: { internalCheckoutId },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl = async () => ({
      status: 'paid',
      stateTransition: 'pending_to_paid',
      stripeEventType: 'checkout.session.completed',
      stripeEventIdSuffix: '12345678',
      orderIdSuffix: internalCheckoutId.slice(-10),
      checkoutSessionIdSuffix: '123456789abc',
      paymentIntentIdSuffix: 'pi_suffix12',
      orderIdToScheduleFulfillment: internalCheckoutId,
      latencyMs: 12,
    });
    try {
      const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
      const res = makeMockRes();
      const t0 = Date.now();
      await handleSlimStripeWebhookPost(req, res, getHandler);
      assert.ok(Date.now() - t0 < 2000);
      assert.equal(handlerCalls, 0);
      assert.equal(res.statusCode, 200);
      const j = JSON.parse(res.body);
      assert.equal(j.received, true);
      assert.equal(j.path, 'slim_checkout_session_completed');
      assert.equal(j.status, 'paid');
      assertNoSecretLeak(res.body);
    } finally {
      delete globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl;
    }
  });

  it('slim-processes checkout.session.expired with valid internalCheckoutId without calling getHandler', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_') && secret.length >= 20,
      'STRIPE_WEBHOOK_SECRET must be usable (setupTestEnv)',
    );
    const internalCheckoutId = 'cmp91xbrt0003jm04m9ub8wrw';
    const payload = JSON.stringify({
      id: `evt_slim_exp_ok_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: `cs_slim_exp_ok_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: { internalCheckoutId },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl = async () => ({
      status: 'cancelled',
      stateTransition: 'pending_to_cancelled',
      stripeEventType: 'checkout.session.expired',
      stripeEventIdSuffix: 'suffix12',
      orderIdSuffix: '8901234',
      checkoutSessionIdSuffix: '123456789abc',
      latencyMs: 8,
    });
    try {
      let handlerCalls = 0;
      const getHandler = async () => {
        handlerCalls += 1;
        return () => {};
      };
      const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
      const res = makeMockRes();
      const t0 = Date.now();
      await handleSlimStripeWebhookPost(req, res, getHandler);
      assert.ok(Date.now() - t0 < 2000);
      assert.equal(handlerCalls, 0);
      assert.equal(res.statusCode, 200);
      const j = JSON.parse(res.body);
      assert.equal(j.received, true);
      assert.equal(j.path, 'slim_checkout_session_expired');
      assert.equal(j.status, 'cancelled');
      assertNoSecretLeak(res.body);
    } finally {
      delete globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl;
    }
  });

  it('fast-acks checkout.session.expired without internalCheckoutId without calling getHandler', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_') && secret.length >= 20,
      'STRIPE_WEBHOOK_SECRET must be usable (setupTestEnv)',
    );
    const payload = JSON.stringify({
      id: `evt_slim_exp_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: `cs_slim_exp_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: {},
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);
    assert.equal(handlerCalls, 0);
    assert.equal(res.statusCode, 200);
    const j = JSON.parse(res.body);
    assert.equal(j.ok, true);
    assert.equal(j.status, 'ignored');
    assert.equal(j.reason, 'unmatched_event');
    assert.equal(j.stripeEventType, 'checkout.session.expired');
  });

  it('fast-acks payment_intent.succeeded when topup_order_id looks valid but metadata.source is not Zora (Stripe CLI fixtures)', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_') && secret.length >= 20,
      'STRIPE_WEBHOOK_SECRET must be usable (setupTestEnv)',
    );
    const orderLike = `tw_ord_${randomUUID()}`;
    const payload = JSON.stringify({
      id: `evt_slim_pi_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_slim_${randomUUID().slice(0, 8)}`,
          object: 'payment_intent',
          status: 'succeeded',
          metadata: { topup_order_id: orderLike },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);
    assert.equal(handlerCalls, 0, 'getHandler must not run for fixture-shaped PI');
    assert.equal(res.statusCode, 200);
    const j = JSON.parse(res.body);
    assert.equal(j.ok, true);
    assert.equal(j.status, 'ignored');
    assert.equal(j.reason, 'unmatched_event');
    assert.equal(j.stripeEventType, 'payment_intent.succeeded');
  });

  it('hands off payment_intent.succeeded when Zora metadata.source and topup_order_id are present', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_') && secret.length >= 20,
      'STRIPE_WEBHOOK_SECRET must be usable (setupTestEnv)',
    );
    const orderLike = `tw_ord_${randomUUID()}`;
    const payload = JSON.stringify({
      id: `evt_slim_pi_ok_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_slim_ok_${randomUUID().slice(0, 8)}`,
          object: 'payment_intent',
          status: 'succeeded',
          metadata: {
            topup_order_id: orderLike,
            source: WEBTOPUP_STRIPE_PI_METADATA_SOURCE,
          },
        },
      },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return (rq, rs) => {
        rs.statusCode = 200;
        rs.setHeader('Content-Type', 'application/json; charset=utf-8');
        rs.end('{"ok":true,"status":"replay"}');
        return undefined;
      };
    };
    const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);
    assert.equal(handlerCalls, 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, '{"ok":true,"status":"replay"}');
  });

  it('stripeEventSlimUnmatchedFastAck: PI with Zora source + valid tw_ord is not unmatched', () => {
    const orderLike = `tw_ord_${randomUUID()}`;
    const ev = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          object: 'payment_intent',
          metadata: {
            topup_order_id: orderLike,
            source: WEBTOPUP_STRIPE_PI_METADATA_SOURCE,
          },
        },
      },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), false);
  });

  it('createStripeWebhookReplayStream preserves headers for downstream', () => {
    const orig = makeStripeWebhookReq('x', {
      'stripe-signature': 't=0,v1=x',
      'x-custom': '1',
    });
    const replay = createStripeWebhookReplayStream(orig, Buffer.from('{}'));
    assert.equal(replay.headers['stripe-signature'], 't=0,v1=x');
    assert.equal(replay.headers['x-custom'], '1');
  });

  it('rejects oversized body with 413', async () => {
    const getHandler = async () => () => {};
    const big = Buffer.alloc(WEBHOOK_RAW_BODY_LIMIT_BYTES + 1, 0x61);
    const req = makeStripeWebhookReq(big, { 'stripe-signature': 't=1,v1=aa' });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);
    assert.equal(res.statusCode, 413);
    assertNoSecretLeak(res.body);
  });
});

describe('api/index.mjs POST /webhooks/stripe (integration)', () => {
  it('missing Stripe-Signature returns 400 without bootstrap health-test hook events', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => {
      events.push(e);
    };
    try {
      const { default: handler } = await import('../api/index.mjs');
      const buf = Buffer.from('{}');
      const req = Readable.from([buf], { objectMode: false });
      req.method = 'POST';
      req.url = '/webhooks/stripe';
      req.headers = { 'content-type': 'application/json' };
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = makeMockRes();
      const out = handler(req, res);
      assert.ok(out && typeof out.then === 'function', 'handler must return a Promise for POST webhook');
      await out;
      assert.deepEqual(events, []);
      assert.equal(res.statusCode, 400);
      assertNoSecretLeak(res.body);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
