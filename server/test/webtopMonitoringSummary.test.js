import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateWebTopupMonitoringHealth } from '../src/lib/webtopMonitoringSummary.js';

describe('evaluateWebTopupMonitoringHealth', () => {
  const baseQueue = {
    collectedAt: new Date().toISOString(),
    config: {},
    jobsByStatus: {},
    orderFulfillment: {
      queued: 0,
      processing: 0,
      staleQueuedCount: 0,
      staleProcessingCount: 0,
    },
  };

  const baseCircuit = {
    provider: 'reloadly_webtopup',
    durableCircuitEnabled: true,
    state: 'closed',
    recentFailureCount: 0,
    failureThreshold: 5,
    windowMs: 120000,
    cooldownMs: 120000,
    halfOpenMaxProbes: 2,
    cooldownUntil: null,
    openedAt: null,
    halfOpenProbesUsed: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastUpdatedAt: null,
  };

  const thresholds = {
    staleProcessingWarn: 1,
    staleQueuedWarn: 1,
    fulfillmentFailureWarn: 5,
    fallbackAppliedWarn: 1,
  };

  it('returns critical when durable circuit is open', () => {
    const out = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue: baseQueue,
      durableCircuit: { ...baseCircuit, state: 'open' },
      thresholds,
    });
    assert.equal(out.severity, 'critical');
    assert.ok(out.alerts.some((a) => a.id === 'reloadly_durable_circuit_open'));
  });

  it('returns warn for stale processing backlog', () => {
    const out = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue: {
        ...baseQueue,
        orderFulfillment: { ...baseQueue.orderFulfillment, staleProcessingCount: 2 },
      },
      durableCircuit: baseCircuit,
      thresholds,
    });
    assert.equal(out.severity, 'warn');
    assert.ok(out.alerts.some((a) => a.id === 'stale_processing_backlog'));
  });

  it('returns warn for dead_letter jobs', () => {
    const out = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue: {
        ...baseQueue,
        jobsByStatus: { dead_letter: 1 },
      },
      durableCircuit: baseCircuit,
      thresholds,
    });
    assert.equal(out.severity, 'warn');
    assert.ok(out.alerts.some((a) => a.id === 'dead_letter_jobs'));
  });

  it('returns warn when fulfillment failures exceed threshold', () => {
    const out = evaluateWebTopupMonitoringHealth({
      metrics: { fulfillment_failed_retryable: 3, fulfillment_failed_terminal: 3 },
      queue: baseQueue,
      durableCircuit: baseCircuit,
      thresholds,
    });
    assert.equal(out.severity, 'warn');
    assert.ok(out.alerts.some((a) => a.id === 'fulfillment_failures_elevated'));
  });

  it('ignores durable circuit when disabled in config', () => {
    const out = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue: baseQueue,
      durableCircuit: { ...baseCircuit, durableCircuitEnabled: false, state: 'open' },
      thresholds,
    });
    assert.equal(out.severity, 'ok');
    assert.equal(out.alerts.length, 0);
  });
});
