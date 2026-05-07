/**
 * L21 — Declarative fallback policy (no Reloadly HTTP).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AIRTIME_OUTCOME } from '../src/domain/fulfillment/airtimeFulfillmentResult.js';
import {
  explicitReloadlyMockFallbackEnabled,
  liveSimulationProofAllowsOutboundMock,
  reloadlyOutcomeEligibleForUnavailableMockFallback,
} from '../src/domain/delivery/providerFallbackPolicy.js';

describe('providerFallbackPolicy (L21)', () => {
  it('only UNAVAILABLE outcome may chain to mock fallback', () => {
    assert.equal(reloadlyOutcomeEligibleForUnavailableMockFallback(AIRTIME_OUTCOME.UNAVAILABLE), true);
    assert.equal(reloadlyOutcomeEligibleForUnavailableMockFallback(AIRTIME_OUTCOME.SUCCESS), false);
    assert.equal(reloadlyOutcomeEligibleForUnavailableMockFallback(AIRTIME_OUTCOME.FAILURE), false);
    assert.equal(
      reloadlyOutcomeEligibleForUnavailableMockFallback(AIRTIME_OUTCOME.PENDING_VERIFICATION),
      false,
    );
    assert.equal(reloadlyOutcomeEligibleForUnavailableMockFallback(AIRTIME_OUTCOME.AMBIGUOUS), false);
  });

  it('explicit mock fallback requires env flag on env snapshot', () => {
    assert.equal(explicitReloadlyMockFallbackEnabled({ reloadlyAllowUnavailableMockFallback: true }), true);
    assert.equal(explicitReloadlyMockFallbackEnabled({ reloadlyAllowUnavailableMockFallback: false }), false);
    assert.equal(explicitReloadlyMockFallbackEnabled({}), false);
  });

  it('live simulation proof flag is opt-in', () => {
    assert.equal(liveSimulationProofAllowsOutboundMock({ ZW_LIVE_SIMULATION_PROOF: 'true' }), true);
    assert.equal(liveSimulationProofAllowsOutboundMock({ ZW_LIVE_SIMULATION_PROOF: 'false' }), false);
    assert.equal(liveSimulationProofAllowsOutboundMock({}), false);
  });
});
