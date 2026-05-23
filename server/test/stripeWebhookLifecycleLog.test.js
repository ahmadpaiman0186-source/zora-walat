import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { logStripeWebhookLifecycle } from '../src/lib/stripeWebhookLifecycleLog.js';

describe('stripeWebhookLifecycleLog', () => {
  it('emits structured JSON without secrets', () => {
    const lines = [];
    const orig = console.log;
    console.log = (line) => {
      lines.push(String(line));
    };
    try {
      logStripeWebhookLifecycle('signature_verified', {
        success: true,
        stripeEventType: 'checkout.session.expired',
        stripeEventIdSuffix: 'abcd1234',
      });
      assert.equal(lines.length, 1);
      const j = JSON.parse(lines[0]);
      assert.equal(j.event, 'signature_verified');
      assert.equal(j.schema, 'zora.stripe_webhook_lifecycle.v1');
      assert.equal(j.stripeEventType, 'checkout.session.expired');
      assert.ok(!JSON.stringify(j).includes('whsec_'));
    } finally {
      console.log = orig;
    }
  });
});
