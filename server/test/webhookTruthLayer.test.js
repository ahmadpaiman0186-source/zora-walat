/**
 * Layer 5 — webhook payment truth contract (unit; no Stripe HTTP).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';

import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import {
  WEBHOOK_PAYMENT_TRUTH_FAILURE,
  assertWebhookAmountCurrencyMatch,
  buildWebhookTruthAuditPayload,
  classifyWebhookPaymentTruthFailure,
  validateStripeCheckoutSessionTruth,
} from '../src/payment/webhookTruthContract.js';

/** CUID-shaped id for `isLikelyPaymentCheckoutId` (alphanumeric 20–36). */
const TEST_CHECKOUT_ID = `cm${'x'.repeat(23)}`;

const baseOrder = () => ({
  id: TEST_CHECKOUT_ID,
  userId: 'usr_x',
  orderStatus: ORDER_STATUS.PENDING,
  status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
  amountUsdCents: 1000,
  currency: 'usd',
  stripeCheckoutSessionId: null,
});

const baseSession = (oid = TEST_CHECKOUT_ID) => ({
  id: `cs_test_${randomUUID().slice(0, 8)}`,
  object: 'checkout.session',
  mode: 'payment',
  payment_status: 'paid',
  amount_total: 1000,
  currency: 'usd',
  payment_intent: 'pi_test',
  customer: 'cus_test',
  metadata: { internalCheckoutId: oid },
});

describe('validateStripeCheckoutSessionTruth', () => {
  it('rejects unsupported event type', () => {
    const r = validateStripeCheckoutSessionTruth({
      session: baseSession(),
      order: baseOrder(),
      stripeEventType: 'customer.created',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.UNSUPPORTED_EVENT_TYPE);
  });

  it('rejects missing internalCheckoutId', () => {
    const r = validateStripeCheckoutSessionTruth({
      session: { ...baseSession(), metadata: {} },
      order: baseOrder(),
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.MISSING_INTERNAL_CHECKOUT_ID);
  });

  it('rejects order_not_found when order null', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: baseSession(oid),
      order: null,
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.ORDER_NOT_FOUND);
  });

  it('rejects amount mismatch', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: { ...baseSession(oid), amount_total: 999 },
      order: baseOrder(),
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.AMOUNT_MISMATCH);
  });

  it('rejects currency mismatch', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: { ...baseSession(oid), currency: 'eur' },
      order: baseOrder(),
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.CURRENCY_MISMATCH);
  });

  it('rejects unpaid session', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: { ...baseSession(oid), payment_status: 'unpaid' },
      order: baseOrder(),
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.UNPAID_SESSION);
  });

  it('rejects non-payment mode', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: { ...baseSession(oid), mode: 'subscription' },
      order: baseOrder(),
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.UNSUPPORTED_EVENT_TYPE);
  });

  it('allows valid paid session vs pending order', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: baseSession(oid),
      order: { ...baseOrder(), id: oid },
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, true);
    assert.equal(r.audit?.webhook_truth_validated, true);
    assert.ok(typeof r.stripeSessionId === 'string');
  });

  it('duplicate_event when order already PAID', () => {
    const oid = baseOrder().id;
    const r = validateStripeCheckoutSessionTruth({
      session: baseSession(oid),
      order: {
        ...baseOrder(),
        id: oid,
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      },
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.failureClass, WEBHOOK_PAYMENT_TRUTH_FAILURE.DUPLICATE_EVENT);
  });
});

describe('assertWebhookAmountCurrencyMatch', () => {
  it('matches when totals align', () => {
    const r = assertWebhookAmountCurrencyMatch({
      session: { amount_total: 500, currency: 'usd' },
      order: { amountUsdCents: 500, currency: 'usd' },
    });
    assert.equal(r.ok, true);
  });
});

describe('classifyWebhookPaymentTruthFailure', () => {
  it('duplicate_event is info severity', () => {
    const c = classifyWebhookPaymentTruthFailure(
      WEBHOOK_PAYMENT_TRUTH_FAILURE.DUPLICATE_EVENT,
    );
    assert.equal(c.severity, 'info');
    assert.equal(c.httpAck, '200');
  });
});

describe('buildWebhookTruthAuditPayload', () => {
  it('includes safe suffixes only', () => {
    const p = buildWebhookTruthAuditPayload({
      session: { id: 'cs_abcdefghijkl' },
      order: { id: 'ord_abcdefghijkl' },
      traceId: 't1',
      stripeEventType: 'checkout.session.completed',
    });
    assert.equal(p.stripeSessionIdSuffix, 'abcdefghijkl');
    assert.equal(p.orderIdSuffix, 'abcdefghijkl');
  });
});

describe('HTTP: invalid Stripe signature (no mutation path)', () => {
  it('returns 400 and does not accept unsigned payload as truth', async () => {
    assert.ok(
      env.stripeWebhookSecret?.startsWith('whsec_'),
      'STRIPE_WEBHOOK_SECRET required (test env)',
    );
    const app = createApp();
    const payload = JSON.stringify({
      id: `evt_truth_bad_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_truth_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          mode: 'payment',
          payment_status: 'paid',
          amount_total: 1000,
          currency: 'usd',
          metadata: { internalCheckoutId: `cm${'z'.repeat(23)}` },
        },
      },
    });
    const badHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: `whsec_${'y'.repeat(32)}`,
    });
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', badHeader)
      .send(payload);
    assert.equal(res.status, 400);
  });
});
