import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyFailure,
  FAILURE_CLASS,
} from '../src/reliability/failureClassifier.js';

describe('L7 failureClassifier', () => {
  it('Stripe invalid signature → critical, non-retryable, security posture', () => {
    const c = classifyFailure({
      signal: 'stripe_webhook_signature_invalid',
      source: 'webhook',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.STRIPE_WEBHOOK_SIGNATURE_INVALID);
    assert.equal(c.severity, 'critical');
    assert.equal(c.retryable, false);
    assert.equal(c.moneyPathImpact, 'none');
  });

  it('provider timeout → retryable', () => {
    const c = classifyFailure({
      signal: 'provider_timeout',
      source: 'provider',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.PROVIDER_TIMEOUT);
    assert.equal(c.retryable, true);
    assert.equal(c.severity, 'warn');
  });

  it('ledger unbalanced → critical, non-retryable', () => {
    const c = classifyFailure({
      signal: 'ledger_unbalanced',
      source: 'ledger',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.LEDGER_UNBALANCED);
    assert.equal(c.severity, 'critical');
    assert.equal(c.retryable, false);
    assert.equal(c.requiresHumanReview, true);
  });

  it('stale fulfillment → retryable recovery candidate', () => {
    const c = classifyFailure({
      signal: 'fulfillment_stale_processing',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.FULFILLMENT_STALE_PROCESSING);
    assert.equal(c.retryable, true);
    assert.equal(c.safeRecoveryAction, 'schedule_fulfillment_redispatch');
  });

  it('fraud high-risk block → expected deny (info or warn)', () => {
    const c = classifyFailure({
      code: 'fraud_high_risk_blocked',
      message: 'fraud block policy',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.FRAUD_HIGH_RISK_BLOCKED);
    assert.ok(c.severity === 'info' || c.severity === 'warn');
    assert.equal(c.retryable, false);
    assert.equal(c.moneyPathImpact, 'none');
  });

  it('DB unavailable → critical', () => {
    const c = classifyFailure({
      signal: 'db_unavailable',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.DB_UNAVAILABLE);
    assert.equal(c.severity, 'critical');
    assert.equal(c.moneyPathImpact, 'blocked');
  });

  it('Redis unavailable → warn, degraded (non-fatal classification)', () => {
    const c = classifyFailure({
      signal: 'redis_unavailable',
      message: 'redis econnrefused',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.REDIS_UNAVAILABLE);
    assert.equal(c.severity, 'warn');
    assert.equal(c.moneyPathImpact, 'degraded');
  });

  it('webhook truth rejected → blocked money path', () => {
    const c = classifyFailure({
      signal: 'webhook_truth_rejected',
    });
    assert.equal(c.failureClass, FAILURE_CLASS.WEBHOOK_TRUTH_REJECTED);
    assert.equal(c.moneyPathImpact, 'blocked');
  });
});
