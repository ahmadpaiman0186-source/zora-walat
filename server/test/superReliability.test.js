import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { CircuitBreaker, resetSharedCircuitBreakersForTests } from '../src/services/reliability/circuitBreaker.js';
import { withRetry, getRetryEngineStats } from '../src/services/reliability/retryEngine.js';
import { isSafeToRetryTopupResult } from '../src/services/reliability/failureModel.js';
import { executeTopupWithReliability } from '../src/services/providers/providerRouter.js';
import { enqueueReliabilityRecoveryJob } from '../src/services/reliability/recoveryQueue.js';
import {
  computeOperatorReadiness,
  getReliabilityWatchdogSnapshot,
} from '../src/services/reliability/watchdog.js';

describe('retryEngine.withRetry', () => {
  it('retries on safe transient result then succeeds on 2nd attempt', async () => {
    let n = 0;
    const r = await withRetry(
      async () => {
        n += 1;
        if (n < 2) {
          return {
            outcome: 'failed_retryable',
            errorCode: 'provider_unavailable',
            errorMessageSafe: 'x',
          };
        }
        return { outcome: 'succeeded', providerReference: 'ref' };
      },
      {
        maxAttempts: 3,
        backoffMs: [1, 2, 3],
        shouldRetryResult: (val) => isSafeToRetryTopupResult(/** @type {*} */ (val)),
        label: 'test_retry',
      },
    );
    assert.equal(r.ok, true);
    assert.equal(/** @type {{ outcome: string }} */ (r.value).outcome, 'succeeded');
    assert.equal(r.attempts, 2);
  });

  it('does not retry terminal business outcome', async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls += 1;
        return {
          outcome: 'invalid_request',
          errorCode: 'INVALID_PRODUCT',
          errorMessageSafe: 'bad',
        };
      },
      {
        maxAttempts: 3,
        backoffMs: [1, 2, 3],
        shouldRetryResult: (val) => isSafeToRetryTopupResult(/** @type {*} */ (val)),
      },
    );
    assert.equal(r.ok, true);
    assert.equal(calls, 1);
  });
});

describe('CircuitBreaker', () => {
  beforeEach(() => {
    resetSharedCircuitBreakersForTests();
  });

  it('opens after failure threshold and blocks until cooldown, then half-open probe', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 2,
      windowMs: 60_000,
      /** Must exceed any real elapsed time between failures and the next `allowRequest` on slow CI. */
      cooldownMs: 200,
      halfOpenMaxCalls: 1,
    });
    assert.equal(cb.allowRequest(), true);
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.getState(), 'OPEN');
    assert.equal(cb.allowRequest(), false);
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(cb.allowRequest(), true);
    assert.equal(cb.getState(), 'HALF_OPEN');
    cb.recordSuccess();
    assert.equal(cb.getState(), 'CLOSED');
  });
});

describe('providerRouter.executeTopupWithReliability', () => {
  beforeEach(() => {
    resetSharedCircuitBreakersForTests();
  });

  it('reloadly primary succeeds when durable circuit is disabled (in-memory gate)', async () => {
    const prev = process.env.WEBTOPUP_RELOADLY_DURABLE_CIRCUIT_ENABLED;
    process.env.WEBTOPUP_RELOADLY_DURABLE_CIRCUIT_ENABLED = 'false';
    try {
      const request = {
        orderId: 'ord1',
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'x',
        operatorLabel: 'x',
        phoneNationalDigits: '712345678',
        productId: 'p',
        productName: 'p',
        amountCents: 100,
        currency: 'usd',
      };

      const primary = {
        id: 'reloadly',
        sendTopup: async () => ({
          outcome: 'succeeded',
          providerReference: 'okref',
        }),
      };

      const out = await executeTopupWithReliability({
        request,
        primary: /** @type {*} */ (primary),
        log: undefined,
        traceId: 't1',
        orderIdSuffix: 'suffix',
      });

      assert.equal(out.outcome, 'succeeded');
      assert.equal(out.providerReference, 'okref');
    } finally {
      process.env.WEBTOPUP_RELOADLY_DURABLE_CIRCUIT_ENABLED = prev;
    }
  });

  it('failover: primary transient exhausts → injected fallback succeeds', async () => {
    const request = {
      orderId: 'ord1',
      destinationCountry: 'AF',
      productType: 'airtime',
      operatorKey: 'x',
      operatorLabel: 'x',
      phoneNationalDigits: '712345678',
      productId: 'p',
      productName: 'p',
      amountCents: 100,
      currency: 'usd',
    };

    const primary = {
      id: 'bad',
      sendTopup: async () => ({
        outcome: 'failed_retryable',
        errorCode: 'provider_unavailable',
        errorMessageSafe: 'down',
      }),
    };

    const fallback = {
      id: 'good',
      sendTopup: async () => ({
        outcome: 'succeeded',
        providerReference: 'okref',
      }),
    };

    const out = await executeTopupWithReliability({
      request,
      primary: /** @type {*} */ (primary),
      log: undefined,
      traceId: 't1',
      orderIdSuffix: 'suffix',
      injectFallbackProvider: /** @type {*} */ (fallback),
    });

    assert.equal(out.outcome, 'succeeded');
    assert.equal(out.providerReference, 'okref');
  });
});

describe('recoveryQueue.enqueueReliabilityRecoveryJob', () => {
  it('invokes enqueueFn and returns ok', async () => {
    let called = 0;
    const r = await enqueueReliabilityRecoveryJob({
      orderId: 'order-uuid-test',
      attemptNo: 1,
      reason: 'unit',
      traceId: 'tr',
      log: undefined,
      enqueueFn: async (orderId, attemptNo) => {
        called += 1;
        assert.equal(orderId, 'order-uuid-test');
        assert.equal(attemptNo, 1);
        return { dedupeKey: 'twf:order-uuid-test:1' };
      },
    });
    assert.equal(r.ok, true);
    assert.equal(called, 1);
  });
});

describe('watchdog + retry stats', () => {
  beforeEach(() => {
    resetSharedCircuitBreakersForTests();
  });

  it('getReliabilityWatchdogSnapshot includes retries and circuits', () => {
    const before = getRetryEngineStats().totalRetryAttempts;
    void before;
    const snap = getReliabilityWatchdogSnapshot();
    assert.equal(typeof snap.collectedAt, 'string');
    assert.ok(snap.retries);
    assert.ok(snap.circuits);
    assert.ok(Array.isArray(snap.orchestratorDecisionsRecent));
    assert.ok(snap.decisionIntelligence);
    assert.ok(typeof snap.decisionIntelligence.readinessHint === 'string');
    assert.ok(snap.operatorSeverityPolicyReference);
    const or = snap.decisionIntelligence.operatorReadiness;
    assert.ok(or && typeof or.posture === 'string');
    assert.ok(Array.isArray(or.factors));
    assert.ok(typeof or.narrative === 'string');
  });

  it('computeOperatorReadiness classifies OPEN circuit as blocked', () => {
    const r = computeOperatorReadiness({
      circuits: { stripe_api: { state: 'OPEN' } },
      retries: { totalRetryAttempts: 0 },
      decisionOutcomeRollup: {},
      decisionSeverityRollup: {},
      avgMs: null,
      retrySpike: 'normal',
    });
    assert.equal(r.posture, 'blocked');
    assert.ok(r.factors.includes('circuit_open'));
  });

  it('computeOperatorReadiness prefers degraded over review_heavy under load', () => {
    const r = computeOperatorReadiness({
      circuits: {},
      retries: { totalRetryAttempts: 600 },
      decisionOutcomeRollup: {},
      decisionSeverityRollup: { high_requires_review: 10 },
      avgMs: null,
      retrySpike: 'elevated',
    });
    assert.equal(r.posture, 'degraded');
  });
});
