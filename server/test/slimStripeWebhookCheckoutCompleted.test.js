/**
 * Hosted checkout.session.completed slim classifier + skip breadcrumb.
 */
import assert from 'node:assert/strict';
import { describe, it, mock, afterEach } from 'node:test';

import {
  isHostedCheckoutSessionCompletedEvent,
  logPhase1WebhookFulfillmentDispatchSkippedSlim,
  slimPostCommitFulfillmentDispatchMode,
} from '../handlers/slimStripeWebhookCheckoutCompleted.mjs';

describe('isHostedCheckoutSessionCompletedEvent', () => {
  it('returns true when internalCheckoutId is a valid checkout id', () => {
    const ev = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_abc',
          metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
        },
      },
    };
    assert.equal(isHostedCheckoutSessionCompletedEvent(ev), true);
  });

  it('returns false when metadata is missing', () => {
    const ev = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_abc', metadata: {} } },
    };
    assert.equal(isHostedCheckoutSessionCompletedEvent(ev), false);
  });
});

describe('slimPostCommitFulfillmentDispatchMode', () => {
  const orderId = 'cmp91xbrt0003jm04m9ub8wrw';

  it('returns none when order id is missing', () => {
    assert.equal(slimPostCommitFulfillmentDispatchMode(null, true), 'none');
    assert.equal(slimPostCommitFulfillmentDispatchMode('', false), 'none');
  });

  it('returns schedule when skip flag is false', () => {
    assert.equal(slimPostCommitFulfillmentDispatchMode(orderId, false), 'schedule');
  });

  it('returns skip when skip flag is true', () => {
    assert.equal(slimPostCommitFulfillmentDispatchMode(orderId, true), 'skip');
  });
});

describe('logPhase1WebhookFulfillmentDispatchSkippedSlim', () => {
  const orderId = 'cmqsttb030001js04ga34utoy';
  const traceId = '3a75a892-eff5-4c96-b9b9-f35848951556';

  afterEach(() => {
    mock.restoreAll();
  });

  it('emits audit-grade skip breadcrumb fields', () => {
    const logs = [];
    mock.method(console, 'log', (line) => {
      logs.push(line);
    });

    logPhase1WebhookFulfillmentDispatchSkippedSlim(orderId, traceId);

    assert.equal(logs.length, 1);
    const payload = JSON.parse(String(logs[0]));
    assert.equal(payload.event, 'phase1_webhook_fulfillment_dispatch_skipped');
    assert.equal(payload.schema, 'zora.webhook_slim.v1');
    assert.equal(payload.path, 'slim_post_commit');
    assert.equal(payload.reason, 'PHASE1_WEBHOOK_SKIP_FULFILLMENT_DISPATCH');
    assert.equal(payload.orderIdSuffix, '04ga34utoy');
    assert.equal(payload.providerCallPerformed, false);
    assert.equal(payload.realMoney, false);
    assert.equal(payload.liveCardUsed, false);
    assert.equal(payload.traceId, traceId);
    assert.equal(typeof payload.t, 'string');
  });
});
