import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { afterEach, describe, it } from 'node:test';

import Stripe from 'stripe';

import {
  buildStripeWebhookAuditRecord,
  recordStripeWebhookAudit,
  sanitizeStripeWebhookAuditInput,
  STRIPE_WEBHOOK_AUDIT_ALLOWED_FIELDS,
} from '../api/stripeWebhookAudit.mjs';
import { handleSlimStripeWebhookPost } from '../api/slimStripeWebhookHandler.mjs';

function makeStripeWebhookReq(body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/webhooks/stripe?token=must_not_persist';
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
    end(data) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        this.body = typeof data === 'string' ? data : data.toString('utf8');
      }
      this.ended = true;
    },
  };
}

function signedHeader(payload) {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}

function assertAuditContainsNoSensitiveText(records) {
  const text = JSON.stringify(records);
  assert.equal(text.includes('raw_body_secret'), false);
  assert.equal(text.includes('t=1700000000,v1='), false);
  assert.equal(text.includes('whsec_'), false);
  assert.equal(text.includes('sk_live_'), false);
  assert.equal(text.includes('customer@example.com'), false);
  assert.equal(text.includes('4242424242424242'), false);
  assert.equal(text.includes('internalCheckoutId'), false);
}

afterEach(() => {
  delete globalThis.__zwStripeWebhookAuditAdapter;
  delete globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl;
});

describe('STR-12 Stripe webhook audit sanitizer', () => {
  it('keeps only allowlisted non-sensitive metadata fields', () => {
    const record = buildStripeWebhookAuditRecord({
      event_id: 'evt_safe_123',
      event_type: 'checkout.session.expired',
      stripe_account_mode: 'test',
      route: '/webhooks/stripe?secret=drop_me',
      signature_verification_status: 'verified',
      idempotency_status: 'new',
      handler_stage: 'response_sent',
      response_status: 200,
      ack_latency_ms: 14.2,
      correlation_id: 'corr_123',
      raw_body: 'raw_body_secret',
      stripe_signature: 't=1700000000,v1=bad',
      webhook_secret: 'whsec_should_not_persist',
      customer_email: 'customer@example.com',
      card_number: '4242424242424242',
      metadata: { internalCheckoutId: 'should_not_persist' },
    });

    for (const key of Object.keys(record)) {
      assert.equal(STRIPE_WEBHOOK_AUDIT_ALLOWED_FIELDS.has(key), true, `${key} must be allowed`);
    }
    assert.equal(record.route, '/webhooks/stripe');
    assert.equal(record.response_status, 200);
    assert.equal(record.ack_latency_ms, 14);
    assertAuditContainsNoSensitiveText([record]);
  });

  it('drops invalid enum values and object payloads', () => {
    const record = sanitizeStripeWebhookAuditInput({
      event_id: 'evt_safe_456',
      stripe_account_mode: 'live',
      signature_verification_status: 'raw_signature_header',
      idempotency_status: 'charge_customer_again',
      response_status: 'not-a-number',
      event_type: { nested: 'blocked' },
    });
    assert.deepEqual(record, { event_id: 'evt_safe_456' });
  });

  it('returns redacted audit adapter errors without throwing', async () => {
    const result = await recordStripeWebhookAudit(
      { route: '/webhooks/stripe', handler_stage: 'route_entry' },
      () => {
        const err = new Error('contains sensitive details that must not be stored');
        err.code = 'DB_WRITE_FAILED_WITH_SECRET';
        throw err;
      },
    );
    assert.equal(result.ok, false);
    assert.equal(result.redacted_error_code, 'DB_WRITE_FAILED_WITH_SECRET');
    assert.equal(result.record.redacted_error_code, 'DB_WRITE_FAILED_WITH_SECRET');
  });
});

describe('STR-12 slim webhook audit integration', () => {
  it('keeps invalid signature fail-closed and records only safe metadata', async () => {
    const records = [];
    globalThis.__zwStripeWebhookAuditAdapter = async (record) => {
      records.push(record);
    };

    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const payload = JSON.stringify({
      id: `evt_invalid_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: `cs_invalid_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: {
            internalCheckoutId: 'raw_body_secret',
            email: 'customer@example.com',
          },
        },
      },
    });
    const badHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: `whsec_${'z'.repeat(32)}`,
    });

    const req = makeStripeWebhookReq(payload, { 'stripe-signature': badHeader });
    const res = makeMockRes();
    await handleSlimStripeWebhookPost(req, res, getHandler);

    assert.equal(handlerCalls, 0);
    assert.equal(res.statusCode, 400);
    assert.equal(res.ended, true);
    assert.equal(records.some((r) => r.handler_stage === 'route_entry'), true);
    assert.equal(records.some((r) => r.handler_stage === 'signature_verification_failed'), true);
    assert.equal(records.some((r) => r.handler_stage === 'response_sent' && r.response_status === 400), true);
    assertAuditContainsNoSensitiveText(records);
  });

  it('does not let audit adapter failure change invalid signature behavior', async () => {
    globalThis.__zwStripeWebhookAuditAdapter = async () => {
      throw Object.assign(new Error('audit unavailable'), { code: 'AUDIT_DOWN' });
    };
    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const req = makeStripeWebhookReq('{}', { 'stripe-signature': 't=1,v1=invalid' });
    const res = makeMockRes();

    await handleSlimStripeWebhookPost(req, res, getHandler);

    assert.equal(handlerCalls, 0);
    assert.equal(res.statusCode, 400);
    assert.equal(res.ended, true);
  });

  it('records verified slim expired idempotency and response metadata without side effects', async () => {
    const records = [];
    globalThis.__zwStripeWebhookAuditAdapter = async (record) => {
      records.push(record);
    };
    globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl = async () => ({
      status: 'duplicate_ignored',
      stateTransition: 'duplicate_shadow_ack',
      stripeEventType: 'checkout.session.expired',
      stripeEventIdSuffix: 'suffix12',
      orderIdSuffix: '8901234',
      checkoutSessionIdSuffix: '123456789abc',
      latencyMs: 8,
    });

    const payload = JSON.stringify({
      id: `evt_audit_exp_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.expired',
      livemode: false,
      data: {
        object: {
          id: `cs_audit_exp_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
        },
      },
    });

    let handlerCalls = 0;
    const getHandler = async () => {
      handlerCalls += 1;
      return () => {};
    };
    const req = makeStripeWebhookReq(payload, { 'stripe-signature': signedHeader(payload) });
    const res = makeMockRes();

    await handleSlimStripeWebhookPost(req, res, getHandler);

    assert.equal(handlerCalls, 0);
    assert.equal(res.statusCode, 200);
    const response = JSON.parse(res.body);
    assert.equal(response.received, true);
    assert.equal(response.status, 'duplicate_ignored');

    assert.equal(records.some((r) => r.signature_verification_status === 'verified'), true);
    assert.equal(records.some((r) => r.event_type === 'checkout.session.expired'), true);
    assert.equal(records.some((r) => r.stripe_account_mode === 'test'), true);
    assert.equal(records.some((r) => r.handler_stage === 'idempotency_checked' && r.idempotency_status === 'duplicate_shadow_ack'), true);
    const responseAudit = records.find((r) => r.handler_stage === 'response_sent' && r.response_status === 200);
    assert.ok(responseAudit);
    assert.equal(typeof responseAudit.ack_latency_ms, 'number');
    assertAuditContainsNoSensitiveText(records);
  });
});
