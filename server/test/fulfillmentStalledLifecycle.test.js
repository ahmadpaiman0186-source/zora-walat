import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStalledSubstate,
  FULFILLMENT_STALLED_SUBSTATE,
} from '../src/domain/fulfillment/fulfillmentStalledLifecycle.js';

describe('resolveStalledSubstate', () => {
  it('marks in-flight unknown when inquiry not_found and redis marker', () => {
    assert.equal(
      resolveStalledSubstate('not_found', { redisInFlightMarker: true, recentDbAttempt: false }),
      FULFILLMENT_STALLED_SUBSTATE.IN_FLIGHT_UNKNOWN,
    );
  });

  it('marks inconclusive for inquiry_timeout', () => {
    assert.equal(
      resolveStalledSubstate('inquiry_timeout', {}),
      FULFILLMENT_STALLED_SUBSTATE.INQUIRY_INCONCLUSIVE,
    );
  });
});
