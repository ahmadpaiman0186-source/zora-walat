/**
 * L11 — `checkout.sessions.create` reliability through {@link orchestrateStripeCall}
 * (same path as `paymentController`: bounded attempts, stable Stripe idempotency key).
 *
 * Uses synthetic errors + mocked session results only — **no HTTP**, **no live Stripe**
 * (`sk_live_*` never involved).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';

import { TRANSACTION_FAILURE_CLASS } from '../src/constants/transactionFailureClass.js';
import { classifyTransactionFailure } from '../src/constants/transactionFailureClass.js';
import {
  FAILURE_CATEGORY_EXPLICIT,
  classifyErrorToExplicitCategory,
} from '../src/services/reliability/failureModel.js';
import { resetSharedCircuitBreakersForTests } from '../src/services/reliability/circuitBreaker.js';
import { orchestrateStripeCall } from '../src/services/reliability/reliabilityOrchestrator.js';
import { getRecentReliabilityDecisions } from '../src/services/reliability/watchdog.js';

/** Mirrors Stripe SDK transport failures retried by {@link orchestrateStripeCall}. */
function checkoutCreateTransportErr() {
  const e = new Error('stripe checkout sessions.create connection failure');
  e.type = 'StripeConnectionError';
  e.name = 'StripeConnectionError';
  return e;
}

describe('L11 checkout.sessions.create (orchestrateStripeCall)', () => {
  beforeEach(() => {
    resetSharedCircuitBreakersForTests();
  });

  it('matches paymentController: maxAttempts 2, backoff bounded', async () => {
    const idempotencyKey = `stripeidem_${randomUUID().replace(/-/g, '')}`;
    /** @type {string[]} */
    const keysSeen = [];
    let calls = 0;

    const session = await orchestrateStripeCall({
      operationName: 'checkout.sessions.create',
      traceId: 'l11-checkout-create',
      log: undefined,
      maxAttempts: 2,
      backoffMs: [1, 2],
      fn: async () => {
        calls += 1;
        keysSeen.push(idempotencyKey);
        if (calls < 2) throw checkoutCreateTransportErr();
        return {
          id: 'cs_test_l11_mock_only',
          url: 'https://checkout.stripe.test/c/pay/cs_test_l11_mock_only#test',
        };
      },
    });

    assert.equal(calls, 2);
    assert.deepEqual(keysSeen, [idempotencyKey, idempotencyKey]);
    assert.equal(session.id, 'cs_test_l11_mock_only');
    /** Single successful session — no duplicate cs_* side effects from retries. */
    assert.match(session.id, /^cs_test_/);
  });

  it('exhaustion: exactly maxAttempts calls, no session returned, reliability retry_exhausted', async () => {
    const beforeLen = getRecentReliabilityDecisions().length;
    let calls = 0;

    /** @type {unknown} */
    let thrown;
    try {
      await orchestrateStripeCall({
        operationName: 'checkout.sessions.create',
        traceId: 'l11-checkout-exhaust',
        log: undefined,
        maxAttempts: 2,
        backoffMs: [1, 2],
        fn: async () => {
          calls += 1;
          throw checkoutCreateTransportErr();
        },
      });
      assert.fail('expected orchestrator to throw');
    } catch (e) {
      thrown = e;
    }

    assert.equal(calls, 2);
    assert.ok(thrown && typeof thrown === 'object');
    assert.equal(
      /** @type {{ type?: string }} */ (thrown).type,
      'StripeConnectionError',
    );

    assert.equal(
      classifyErrorToExplicitCategory(thrown),
      FAILURE_CATEGORY_EXPLICIT.PROVIDER_FAILURE,
    );
    assert.equal(
      classifyTransactionFailure(thrown),
      TRANSACTION_FAILURE_CLASS.TRANSIENT_STRIPE,
    );

    const tail = getRecentReliabilityDecisions().slice(beforeLen);
    const exhausted = tail.filter(
      (d) =>
        d.operationName === 'checkout.sessions.create' &&
        d.outcome === 'retry_exhausted',
    );
    assert.ok(exhausted.length >= 1);
    assert.equal(exhausted[exhausted.length - 1].category, FAILURE_CATEGORY_EXPLICIT.PROVIDER_FAILURE);
  });
});
