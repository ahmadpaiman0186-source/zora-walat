import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { HttpError } from '../src/lib/httpError.js';
import { resetSharedCircuitBreakersForTests } from '../src/services/reliability/circuitBreaker.js';
import {
  orchestrateStripeCall,
  orchestrateRechargeProviderCall,
  isStripeErrorRetryable,
} from '../src/services/reliability/reliabilityOrchestrator.js';
import { getRecentReliabilityDecisions } from '../src/services/reliability/watchdog.js';

describe('reliabilityOrchestrator.isStripeErrorRetryable', () => {
  it('treats Stripe connection errors as retryable', () => {
    assert.equal(
      isStripeErrorRetryable({ type: 'StripeConnectionError', message: 'x' }),
      true,
    );
  });

  it('treats Stripe 5xx API errors as retryable', () => {
    assert.equal(
      isStripeErrorRetryable({
        type: 'StripeAPIError',
        statusCode: 503,
        message: 'x',
      }),
      true,
    );
  });

  it('does not retry card / business Stripe errors', () => {
    assert.equal(
      isStripeErrorRetryable({
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'x',
      }),
      false,
    );
  });
});

describe('orchestrateStripeCall', () => {
  beforeEach(() => {
    resetSharedCircuitBreakersForTests();
  });

  it('retry success: transient failure then ok', async () => {
    let n = 0;
    const v = await orchestrateStripeCall({
      operationName: 'test.pi',
      traceId: 'tr',
      log: undefined,
      maxAttempts: 3,
      backoffMs: [1, 2, 3],
      fn: async () => {
        n += 1;
        if (n < 2) {
          const e = new Error('conn');
          e.type = 'StripeConnectionError';
          throw e;
        }
        return { id: 'pi_ok' };
      },
    });
    assert.equal(v.id, 'pi_ok');
    assert.equal(n, 2);
  });

  it('retry exhaustion: throws last error', async () => {
    await assert.rejects(
      async () =>
        orchestrateStripeCall({
          operationName: 'test.fail',
          traceId: null,
          log: undefined,
          maxAttempts: 2,
          backoffMs: [1, 2],
          fn: async () => {
            const e = new Error('conn');
            e.type = 'StripeConnectionError';
            throw e;
          },
        }),
      /conn/,
    );
  });

  it('circuit open: denies with HttpError 503', async () => {
    const connErr = () => {
      const e = new Error('conn');
      e.type = 'StripeConnectionError';
      return e;
    };
    const failOnce = () =>
      orchestrateStripeCall({
        operationName: 'fail_open',
        traceId: 't',
        log: undefined,
        maxAttempts: 1,
        backoffMs: [1],
        fn: async () => {
          throw connErr();
        },
      });
    for (let i = 0; i < 5; i += 1) {
      await assert.rejects(failOnce, /conn/);
    }
    await assert.rejects(
      () =>
        orchestrateStripeCall({
          operationName: 'blocked',
          traceId: 't',
          log: undefined,
          fn: async () => ({ ok: true }),
        }),
      (err) =>
        err instanceof HttpError &&
        err.status === 503 &&
        err.code === 'stripe_circuit_open',
    );
  });

  it('records decisions on success', async () => {
    resetSharedCircuitBreakersForTests();
    const before = getRecentReliabilityDecisions().length;
    await orchestrateStripeCall({
      operationName: 'test.ok',
      traceId: 'tid',
      log: undefined,
      maxAttempts: 2,
      backoffMs: [1],
      fn: async () => ({ x: 1 }),
    });
    const after = getRecentReliabilityDecisions();
    assert.ok(after.length >= before + 1);
    const last = after[after.length - 1];
    assert.equal(last.outcome, 'ok');
    assert.equal(last.operationName, 'test.ok');
    assert.equal(last.failureSeverity, 'low_transient');
  });
});

describe('orchestrateRechargeProviderCall', () => {
  beforeEach(() => {
    resetSharedCircuitBreakersForTests();
  });

  it('normal flow: sync-style provider result', async () => {
    const out = await orchestrateRechargeProviderCall({
      operationName: 'recharge.getQuote',
      traceId: null,
      log: undefined,
      fn: async () => ({ priceCents: 100 }),
    });
    assert.equal(out.priceCents, 100);
  });
});
