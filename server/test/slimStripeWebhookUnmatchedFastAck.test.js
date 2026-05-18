/**
 * L-7 — `stripeEventSlimUnmatchedFastAck` classifier (no DB, no HTTP).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { stripeEventSlimUnmatchedFastAck } from '../api/slimStripeWebhookHandler.mjs';
import { WEBTOPUP_STRIPE_PI_METADATA_SOURCE } from '../src/constants/webTopupStripePiMetadata.js';

describe('stripeEventSlimUnmatchedFastAck (L-7 classifier)', () => {
  it('checkout.session.expired without internalCheckoutId is unmatched', () => {
    const ev = {
      type: 'checkout.session.expired',
      data: { object: { object: 'checkout.session', metadata: {} } },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), true);
  });

  it('checkout.session.expired with unknown-shaped internalCheckoutId is unmatched', () => {
    const ev = {
      type: 'checkout.session.expired',
      data: {
        object: {
          object: 'checkout.session',
          metadata: { internalCheckoutId: 'not-a-valid-cuid-shape!!!' },
        },
      },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), true);
  });

  it('checkout.session.completed without metadata is unmatched', () => {
    const ev = {
      type: 'checkout.session.completed',
      data: { object: { object: 'checkout.session', metadata: {} } },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), true);
  });

  it('customer.created is not slim-unmatched (hands off to full handler)', () => {
    const ev = {
      type: 'customer.created',
      data: { object: { id: `cus_${randomUUID().slice(0, 8)}`, object: 'customer' } },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), false);
  });

  it('invoice.payment_succeeded is not slim-unmatched', () => {
    const ev = {
      type: 'invoice.payment_succeeded',
      data: { object: { id: `in_${randomUUID().slice(0, 8)}`, object: 'invoice' } },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), false);
  });

  it('payment_intent.succeeded without topup_order_id is unmatched', () => {
    const ev = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          object: 'payment_intent',
          metadata: {},
        },
      },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), true);
  });

  it('payment_intent.succeeded with tw_ord shape but wrong source is unmatched', () => {
    const ev = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          object: 'payment_intent',
          metadata: { topup_order_id: `tw_ord_${randomUUID()}` },
        },
      },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), true);
  });

  it('payment_intent.succeeded with Zora source is matched (not unmatched)', () => {
    const ev = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          object: 'payment_intent',
          metadata: {
            topup_order_id: `tw_ord_${randomUUID()}`,
            source: WEBTOPUP_STRIPE_PI_METADATA_SOURCE,
          },
        },
      },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), false);
  });
});
