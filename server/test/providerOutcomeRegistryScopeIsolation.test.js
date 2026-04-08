import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PROVIDER_OUTCOME_REGISTRY_SCOPE } from '../src/services/providerOutcomeRegistry.js';

/** Mirrors `storageKey` hashing in providerOutcomeRegistry.js (scope + external key isolation). */
function digest(scope, externalKey) {
  const s = String(scope ?? '').trim();
  const id = String(externalKey ?? '').trim().slice(0, 240);
  return createHash('sha256').update(`${s}\0${id}`).digest('hex').slice(0, 56);
}

describe('providerOutcomeRegistry scope isolation', () => {
  it('does not share Redis key digest across Phase1 vs WebTop for same external id', () => {
    const id = 'checkout-shared-id';
    const a = digest(PROVIDER_OUTCOME_REGISTRY_SCOPE.PHASE1_PAYMENT_CHECKOUT_RELOADLY, id);
    const b = digest(PROVIDER_OUTCOME_REGISTRY_SCOPE.WEBTOP_RELOADLY, id);
    assert.notEqual(a, b);
  });
});
