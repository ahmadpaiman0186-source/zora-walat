import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import Stripe from 'stripe';

import {
  logStripeWebhookObservability,
  OBSERVABILITY_PREFIX,
} from '../api/stripeWebhookObservability.mjs';
import { handleSlimStripeWebhookPost } from '../api/slimStripeWebhookHandler.mjs';

function captureConsole(method, fn) {
  const lines = [];
  const original = console[method];
  console[method] = (line) => {
    lines.push(String(line));
  };
  return Promise.resolve()
    .then(fn)
    .then(
      () => lines,
      (err) => {
        throw err;
      },
    )
    .finally(() => {
      console[method] = original;
    });
}

function parseObservabilityLines(lines) {
  return lines
    .filter((line) => line.startsWith(OBSERVABILITY_PREFIX))
    .map((line) => JSON.parse(line.slice(OBSERVABILITY_PREFIX.length + 1)));
}

/**
 * @param {Buffer | string} body
 * @param {Record<string, string | string[] | undefined>} [headers]
 */
function makeStripeWebhookReq(body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/webhooks/stripe?debug=ignored';
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

describe('STR-06 Stripe webhook observability logs', () => {
  it('emits allowlisted searchable fields without raw body, signature, or secrets', async () => {
    const lines = await captureConsole('info', () => {
      logStripeWebhookObservability('signature_verified', {
        event_id: 'evt_str06_safe',
        event_type: 'checkout.session.expired',
        stripe_signature: 't=1,v1=signature-must-not-log',
        secret: 'whsec_must_not_log',
        raw_body: '{"customer_email":"person@example.com"}',
        customer_email: 'person@example.com',
      });
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], new RegExp(`^${OBSERVABILITY_PREFIX} `));
    assert.ok(lines[0].includes('signature_verified'));
    assert.ok(lines[0].includes('evt_str06_safe'));
    assert.ok(!lines[0].includes('whsec_'));
    assert.ok(!lines[0].includes('signature-must-not-log'));
    assert.ok(!lines[0].includes('person@example.com'));
    assert.ok(!lines[0].includes('raw_body'));
  });

  it('emits route, signature, expired lifecycle, idempotency, and ACK markers without changing response behavior', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    assert.ok(
      typeof secret === 'string' && secret.startsWith('whsec_') && secret.length >= 20,
      'STRIPE_WEBHOOK_SECRET must be usable (setupTestEnv)',
    );

    const eventId = 'evt_str06_runtime_correlation_123';
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_str06_runtime_correlation_123',
          object: 'checkout.session',
          metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
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
      stripeEventIdSuffix: 'tion_123',
      orderIdSuffix: 'm9ub8wrw',
      checkoutSessionIdSuffix: 'ation_123',
      latencyMs: 9,
    });

    try {
      const lines = await captureConsole('info', async () => {
        const req = makeStripeWebhookReq(payload, { 'stripe-signature': header });
        const res = makeMockRes();
        await handleSlimStripeWebhookPost(req, res, async () => () => {});
        assert.equal(res.statusCode, 200);
        const body = JSON.parse(res.body);
        assert.equal(body.received, true);
        assert.equal(body.path, 'slim_checkout_session_expired');
        assert.equal(body.status, 'cancelled');
      });
      const logs = parseObservabilityLines(lines);
      const markers = logs.map((line) => line.marker);
      assert.ok(markers.includes('route_entry'));
      assert.ok(markers.includes('signature_verified'));
      assert.ok(markers.includes('checkout_session_expired_received'));
      assert.ok(markers.includes('idempotency_decision'));
      assert.ok(markers.includes('response_sent'));

      const signature = logs.find((line) => line.marker === 'signature_verified');
      assert.equal(signature.event_id, eventId);
      assert.equal(signature.event_type, 'checkout.session.expired');

      const routeEntry = logs.find((line) => line.marker === 'route_entry');
      assert.equal(routeEntry.method, 'POST');
      assert.equal(routeEntry.path, '/webhooks/stripe');

      const ack = logs.find((line) => line.marker === 'response_sent');
      assert.equal(ack.status_code, 200);
      assert.equal(ack.event_id, eventId);
      assert.equal(ack.event_type, 'checkout.session.expired');
      assert.equal(typeof ack.duration_ms, 'number');

      const joined = lines.join('\n');
      assert.ok(!joined.includes(secret));
      assert.ok(!joined.includes(header));
      assert.ok(!joined.includes('internalCheckoutId'));
    } finally {
      delete globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl;
    }
  });
});
