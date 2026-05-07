/**
 * L11 — Chaos & reliability harness (unit): bounded retries, queue backoff semantics,
 * and a frozen scenario→evidence matrix for audits (`npm --prefix server test` picks this file).
 *
 * Integration proofs live under `test/integrations/*Chaos*.integration.test.js`,
 * `phase1Resilience.integration.test.js`, `phase1MoneyPath.test.js`, `transactionRetryPolicy.test.js`,
 * `reliabilityOrchestrator.test.js`, `selfHealingMoneyPath.integration.test.js`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TRANSACTION_FAILURE_CLASS } from '../src/constants/transactionFailureClass.js';
import { parseFulfillmentJobRetryDelaysMsFromEnv } from '../src/config/fulfillmentJobRetryConfig.js';
import { transactionRetryDirective } from '../src/lib/transactionRetryPolicy.js';
import { isStripeErrorRetryable } from '../src/services/reliability/reliabilityOrchestrator.js';

/** Frozen checklist — IDs stable for incident retrospectives. */
export const L11_SCENARIO_MATRIX = Object.freeze([
  {
    scenario: 'duplicate_webhook',
    result: 'covered',
    evidence:
      'stripeWebhookHttpChaos.integration.test.js (same evt id + ledger rows); sprint4PaymentLoopProof.integration.test.js; phase1MoneyPath.integration.test.js (P2002)',
  },
  {
    scenario: 'out_of_order_webhook',
    result: 'covered',
    evidence:
      'stripeWebhookHttpChaos.integration.test.js interleave PI vs checkout.session.completed',
  },
  {
    scenario: 'missing_webhook_until_delivery',
    result: 'covered',
    evidence:
      'stripeWebhookHttpChaos.integration.test.js L11 delayed; phase1Resilience.partial_flow awaiting_payment',
  },
  {
    scenario: 'stripe_timeout_checkout_create',
    result: 'covered',
    evidence:
      'l11CheckoutSessionCreateOrchestrator.test.js (checkout.sessions.create op + maxAttempts 2 + stable idempotency key); reliabilityOrchestrator.test.js',
  },
  {
    scenario: 'db_transient_ledger_post',
    result: 'covered',
    evidence:
      'l11LedgerWebhookRollback.integration.test.js (ZW_TEST_INJECT_LEDGER_POST_THROW mid-write rollback); ledgerService.test.js',
  },
  {
    scenario: 'fulfillment_provider_timeout_retry',
    result: 'covered',
    evidence:
      'phase1Resilience.integration.test.js stuck_signals; AIRTIME_PROVIDER=mock in chaos preload',
  },
  {
    scenario: 'queue_retry_backoff',
    result: 'covered',
    evidence:
      'parseFulfillmentJobRetryDelaysMsFromEnv + DEFAULT delays vs transactionRetryPolicy caps',
  },
  {
    scenario: 'network_delay_or_dropped_request',
    result: 'covered',
    evidence:
      'stripeWebhookHttpChaos.integration.test.js L11 corrupt body recovery + latency bench; invalid signature 400 path',
  },
]);

describe('L11 chaos reliability harness', () => {
  it('scenario matrix lists eight mandated L11 scenarios', () => {
    assert.equal(L11_SCENARIO_MATRIX.length, 8);
  });

  it('fulfillment job retry delays: finite list, minimum spacing, no unbounded growth', () => {
    const custom = parseFulfillmentJobRetryDelaysMsFromEnv('210,400,900');
    assert.ok(custom.length >= 1 && custom.length <= 20);
    for (const ms of custom) {
      assert.ok(ms >= 200);
      assert.ok(ms <= 86_400_000);
    }
  });

  it('transactionRetryDirective caps TRANSIENT_DB retries', () => {
    const exhausted = transactionRetryDirective(
      TRANSACTION_FAILURE_CLASS.TRANSIENT_DB,
      { attempt: 50 },
    );
    assert.equal(exhausted.mayScheduleRetry, false);
  });

  it('duplicate guard blocks infinite webhook/job retries', () => {
    const d = transactionRetryDirective(
      TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED,
      { attempt: 0 },
    );
    assert.equal(d.mayScheduleRetry, false);
  });

  it('Stripe-like timeouts classify as orchestrator-retryable', () => {
    assert.equal(
      isStripeErrorRetryable({
        type: 'StripeConnectionError',
        message: 'timeout_sim',
      }),
      true,
    );
  });
});
