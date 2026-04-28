import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateWebTopupMonitoringHealth } from '../src/lib/webtopMonitoringSummary.js';
import { getWebtopIncidentSignals } from '../src/lib/webtopIncidentSignals.js';
import { diagnoseWebtopIncident } from '../src/lib/webtopIncidentDiagnosis.js';
import {
  executeWebtopIncidentAction,
  getSuggestedRunbookActions,
} from '../src/lib/webtopIncidentRunbook.js';

describe('webtop incident handling (Phase 12)', () => {
  it('detects queue backlog from queued jobs vs batch size', () => {
    const queue = {
      collectedAt: new Date().toISOString(),
      config: { batchSize: 10, leaseMs: 300000, pollMs: 3000, staleQueuedOrderMs: 1, staleProcessingOrderMs: 1 },
      jobsByStatus: { queued: 50, processing: 0, completed: 0 },
      orderFulfillment: { queued: 5, processing: 0, staleQueuedCount: 0, staleProcessingCount: 0 },
    };
    const durableCircuit = { durableCircuitEnabled: true, state: 'closed' };
    const evaluate = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue,
      durableCircuit,
      thresholds: { staleProcessingWarn: 99, staleQueuedWarn: 99, fulfillmentFailureWarn: 999, fallbackAppliedWarn: 999 },
    });
    const signals = getWebtopIncidentSignals({
      evaluate,
      queueHealth: queue,
      reloadlyDurableCircuit: durableCircuit,
      slaPolicy: { aggregate: { breachedApproximateCounts: {} } },
      abuseProtection: { blockCounts: {} },
      metricsSummary: { financialGuardrailBlocks: 0, reconciliationMismatches: 0 },
      metrics: {},
    });
    assert.ok(signals.incidents.some((i) => i.id === 'fulfillment_queue_backlog'));
  });

  it('classifies circuit open as critical provider incident', () => {
    const queue = {
      collectedAt: new Date().toISOString(),
      config: { batchSize: 15, leaseMs: 300000, pollMs: 3000, staleQueuedOrderMs: 1, staleProcessingOrderMs: 1 },
      jobsByStatus: {},
      orderFulfillment: { queued: 0, processing: 0, staleQueuedCount: 0, staleProcessingCount: 0 },
    };
    const durableCircuit = { durableCircuitEnabled: true, state: 'open' };
    const evaluate = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue,
      durableCircuit,
      thresholds: { staleProcessingWarn: 99, staleQueuedWarn: 99, fulfillmentFailureWarn: 999, fallbackAppliedWarn: 999 },
    });
    const signals = getWebtopIncidentSignals({
      evaluate,
      queueHealth: queue,
      reloadlyDurableCircuit: durableCircuit,
      slaPolicy: { aggregate: { breachedApproximateCounts: {} } },
      abuseProtection: { blockCounts: {} },
      metricsSummary: {},
      metrics: {},
    });
    assert.equal(signals.severity, 'critical');
    assert.ok(signals.incidents.some((i) => i.type === 'provider_circuit'));
  });

  it('raises SLA breach signal when aggregate counts are non-zero', () => {
    const queue = {
      collectedAt: new Date().toISOString(),
      config: { batchSize: 15, leaseMs: 300000, pollMs: 3000, staleQueuedOrderMs: 1, staleProcessingOrderMs: 1 },
      jobsByStatus: {},
      orderFulfillment: { queued: 0, processing: 0, staleQueuedCount: 0, staleProcessingCount: 0 },
    };
    const evaluate = evaluateWebTopupMonitoringHealth({
      metrics: {},
      queue,
      durableCircuit: { durableCircuitEnabled: false, state: 'closed' },
      thresholds: { staleProcessingWarn: 99, staleQueuedWarn: 99, fulfillmentFailureWarn: 999, fallbackAppliedWarn: 999 },
    });
    const signals = getWebtopIncidentSignals({
      evaluate,
      queueHealth: queue,
      reloadlyDurableCircuit: {},
      slaPolicy: {
        aggregate: {
          breachedApproximateCounts: {
            paymentPendingTimeout: 0,
            stalePendingAfterPayment: 0,
            staleQueued: 2,
            staleProcessing: 0,
          },
        },
      },
      abuseProtection: { blockCounts: {} },
      metricsSummary: {},
      metrics: {},
    });
    assert.ok(signals.incidents.some((i) => i.id === 'sla_breach_stale_queued'));
  });

  it('diagnoseWebtopIncident returns probable causes for circuit incident', () => {
    const incidentSignals = {
      severity: 'critical',
      incidents: [{ id: 'reloadly_durable_circuit_open', type: 'provider_circuit', severity: 'critical', message: 'x', hint: 'y' }],
    };
    const d = diagnoseWebtopIncident({
      incidentSignals,
      configSnapshot: { flags: { uxPublicFieldsEnabled: true } },
    });
    assert.equal(d.incidentType, 'provider_circuit');
    assert.ok(d.probableCauses.length > 0);
    assert.ok(d.affectedSubsystems.includes('reloadly'));
  });

  it('getSuggestedRunbookActions includes recover when stale processing present', () => {
    const actions = getSuggestedRunbookActions([
      { id: 'stale_processing_backlog', type: 'fulfillment_stale_processing', severity: 'warn' },
    ]);
    assert.ok(actions.some((a) => a.id === 'recover_stale_fulfillment_jobs'));
    assert.ok(actions.some((a) => a.requiresConfirmation === true && a.id === 'recover_stale_fulfillment_jobs'));
  });

  it('executeWebtopIncidentAction rejects recover without confirm', async () => {
    await assert.rejects(
      async () =>
        executeWebtopIncidentAction('recover_stale_fulfillment_jobs', {
          log: undefined,
          confirm: false,
        }),
      (e) => e && typeof e === 'object' && 'code' in e && e.code === 'confirmation_required',
    );
  });

  it('executeWebtopIncidentAction allows snapshot_queue_health', async () => {
    const out = await executeWebtopIncidentAction('snapshot_queue_health', { log: undefined });
    assert.equal(out.ok, true);
    assert.ok(out.result && typeof out.result === 'object');
    assert.ok('jobsByStatus' in (out.result ?? {}));
  }, { skip: !process.env.DATABASE_URL });
});
