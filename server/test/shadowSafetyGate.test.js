/**
 * L-78 shadow safety gate — route/handler-shaped integration tests (no DB, no network).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateShadowSafetyGate,
  evaluateShadowSafetyGateBatch,
  peekShadowSafetyGateAtBoundary,
  WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR,
  SHADOW_SAFETY_GATE_SCHEMA_VERSION,
} from '../src/reliability/shadowSafetyGate/index.js';
import {
  allShadowScenarios,
  duplicateProviderDispatchBlocks,
  duplicateWebhookBlocks,
  expiredSessionBlocks,
  missingIdempotencyKeyFailClosed,
  missingPaymentProofFailClosed,
  paidValidUniqueAllowsDryRunIntent,
  unpaidWebhookBlocks,
} from './fixtures/shadowSafetyGate/scenarios.mjs';

function assertShadowNoMutation(report) {
  assert.equal(report.wouldScheduleFulfillment, false);
  assert.equal(report.mutations.stripe, false);
  assert.equal(report.mutations.provider, false);
  assert.equal(report.mutations.db, false);
  assert.equal(report.mutations.fulfillmentScheduled, false);
  assert.equal(report.liveRouteEnforcement, false);
  assert.equal(report.safety.shadow_only, true);
  assert.equal(report.safety.live_route_unchanged, true);
}

describe('L-78 shadow gate — production passthrough', () => {
  it('returns null without shadow mode (live route unchanged)', () => {
    const live = peekShadowSafetyGateAtBoundary({
      scenarioId: 'live_passthrough',
      boundary: 'webhook_post_commit',
      stripeEventType: 'checkout.session.completed',
      stripeEventId: 'evt_live_001',
      orderId: 'ord_live_001',
      paymentCheckoutStatus: 'PAID',
    });
    assert.equal(live, null);
    assert.equal(
      evaluateShadowSafetyGate({
        scenarioId: 'no_shadow',
        boundary: 'webhook_post_commit',
        stripeEventType: 'checkout.session.completed',
      }),
      null,
    );
  });

  it('boundary anchor documents webhook module with L-79/L-80 wiring', () => {
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.shadowWiredInL79, true);
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.sanitizedEnvelopeInL80, true);
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.defaultEnabled, false);
    assert.match(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.module, /stripeWebhook/);
  });
});

describe('L-78 shadow gate — paid valid unique', () => {
  it('allows dry-run fulfillment intent only', () => {
    const report = evaluateShadowSafetyGate(paidValidUniqueAllowsDryRunIntent);
    assert(report);
    assert.equal(report.schemaVersion, SHADOW_SAFETY_GATE_SCHEMA_VERSION);
    assert.equal(report.fulfillmentIntentAllowed, true);
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — unpaid webhook', () => {
  it('blocks fulfillment intent', () => {
    const report = evaluateShadowSafetyGate(unpaidWebhookBlocks);
    assert(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — expired session', () => {
  it('blocks fulfillment intent', () => {
    const report = evaluateShadowSafetyGate(expiredSessionBlocks);
    assert(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — duplicate webhook', () => {
  it('blocks fulfillment intent', () => {
    const report = evaluateShadowSafetyGate(duplicateWebhookBlocks);
    assert(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assert.equal(report.wiredPathReport.idempotencyDecision.decision, 'BLOCK_DUPLICATE');
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — duplicate provider dispatch', () => {
  it('blocks fulfillment intent', () => {
    const report = evaluateShadowSafetyGate(duplicateProviderDispatchBlocks);
    assert(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — missing idempotency key', () => {
  it('fail-closed', () => {
    const report = evaluateShadowSafetyGate(missingIdempotencyKeyFailClosed);
    assert(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — missing payment proof', () => {
  it('fail-closed', () => {
    const report = evaluateShadowSafetyGate(missingPaymentProofFailClosed);
    assert(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertShadowNoMutation(report);
  });
});

describe('L-78 shadow gate — batch expectations', () => {
  it('all handler-shaped scenarios match expected gates', () => {
    const reports = evaluateShadowSafetyGateBatch(allShadowScenarios);
    assert.equal(reports.length, allShadowScenarios.length);
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const scenario = allShadowScenarios[i];
      assert(report, scenario.scenarioId);
      assert.equal(report.scenarioId, scenario.scenarioId);
      assert.equal(
        report.fulfillmentIntentAllowed,
        scenario.expectedFulfillmentIntentAllowed,
        scenario.scenarioId,
      );
      assertShadowNoMutation(report);
    }
  });
});
