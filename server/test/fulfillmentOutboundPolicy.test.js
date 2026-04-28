import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldBlockPhase1ReloadlyOutbound } from '../src/domain/fulfillment/fulfillmentOutboundPolicy.js';

describe('fulfillmentOutboundPolicy', () => {
  it('blocks Reloadly when flag is off and not in test', () => {
    assert.equal(
      shouldBlockPhase1ReloadlyOutbound('development', { phase1FulfillmentOutboundEnabled: false }),
      true,
    );
    assert.equal(
      shouldBlockPhase1ReloadlyOutbound('production', { phase1FulfillmentOutboundEnabled: false }),
      true,
    );
  });

  it('allows when PHASE1_FULFILLMENT_OUTBOUND_ENABLED is true', () => {
    assert.equal(
      shouldBlockPhase1ReloadlyOutbound('production', { phase1FulfillmentOutboundEnabled: true }),
      false,
    );
  });

  it('allows in NODE_ENV=test without flag (automated suite)', () => {
    assert.equal(
      shouldBlockPhase1ReloadlyOutbound('test', { phase1FulfillmentOutboundEnabled: false }),
      false,
    );
  });
});
