/**
 * L-79 feature-flagged webhook boundary shadow diagnostics (no DB, no network).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  buildWebhookShadowContextFromRouteSnapshot,
  evaluateShadowSafetyGate,
  isShadowSafetyGateWebhookDiagnosticsEnabled,
  maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary,
  WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR,
} from '../src/reliability/shadowSafetyGate/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE_SRC = join(__dirname, '../src/routes/stripeWebhook.routes.js');

const disabledEnv = { shadowSafetyGateWebhookDiagnosticsEnabled: false };
const enabledEnv = { shadowSafetyGateWebhookDiagnosticsEnabled: true };

const paidEvent = {
  type: 'checkout.session.completed',
  id: 'evt_boundary_paid_001',
  data: {
    object: {
      payment_status: 'paid',
      status: 'complete',
    },
  },
};

function assertDiagnosticOnly(report) {
  assert(report);
  assert.equal(report.wouldScheduleFulfillment, false);
  assert.equal(report.mutations.fulfillmentScheduled, false);
  assert.equal(report.mutations.provider, false);
  assert.equal(report.mutations.db, false);
  assert.equal(report.liveRouteEnforcement, false);
}

describe('L-79 feature flag resolver', () => {
  it('default flag absent → disabled', () => {
    assert.equal(isShadowSafetyGateWebhookDiagnosticsEnabled({}), false);
    assert.equal(isShadowSafetyGateWebhookDiagnosticsEnabled(disabledEnv), false);
  });

  it('explicit true → enabled', () => {
    assert.equal(isShadowSafetyGateWebhookDiagnosticsEnabled(enabledEnv), true);
  });
});

describe('L-79 default/disabled boundary hook', () => {
  it('returns null when flag disabled (no-op)', () => {
    const result = maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary({
      event: paidEvent,
      orderId: 'chk_noop_001',
      envConfig: disabledEnv,
      log: { info: () => assert.fail('should not log') },
    });
    assert.equal(result, null);
  });

  it('returns null when envConfig omitted (production default)', () => {
    const saved = process.env.SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED;
    delete process.env.SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED;
    try {
      const result = maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary({
        event: paidEvent,
        orderId: 'chk_default_env_001',
      });
      assert.equal(result, null);
    } finally {
      if (saved !== undefined) {
        process.env.SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED = saved;
      }
    }
  });
});

describe('L-79 enabled shadow diagnostics only', () => {
  it('emits diagnostics without scheduling fulfillment', () => {
    let logged = false;
    const report = maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary({
      event: paidEvent,
      orderId: 'chk_diag_001',
      envConfig: enabledEnv,
      log: {
        info: (payload) => {
          logged = true;
          assert.equal(payload.event, 'shadow_safety_gate_webhook_diagnostic');
          assert(payload.envelope);
          assert.equal(payload.envelope.wouldScheduleFulfillment, false);
          assert.equal(payload.envelope.diagnosticsOnly, true);
          assert.ok(payload.envelope.correlationFingerprint);
        },
      },
    });
    assertDiagnosticOnly(report);
    assert.equal(logged, true);
  });
});

describe('L-79 shadow diagnostic scenarios at boundary', () => {
  it('unpaid session → blocked diagnostic', () => {
    const ctx = buildWebhookShadowContextFromRouteSnapshot({
      eventType: 'checkout.session.completed',
      eventId: 'evt_unpaid',
      orderId: 'chk_unpaid',
      session: { payment_status: 'unpaid', status: 'open' },
    });
    const report = evaluateShadowSafetyGate(ctx);
    assertDiagnosticOnly(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
  });

  it('expired session → blocked diagnostic', () => {
    const ctx = buildWebhookShadowContextFromRouteSnapshot({
      eventType: 'checkout.session.expired',
      eventId: 'evt_expired',
      orderId: 'chk_expired',
      session: { payment_status: 'unpaid', status: 'expired' },
    });
    const report = evaluateShadowSafetyGate(ctx);
    assertDiagnosticOnly(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
  });

  it('duplicate webhook event → blocked diagnostic', () => {
    const ctx = buildWebhookShadowContextFromRouteSnapshot({
      eventType: 'checkout.session.completed',
      eventId: 'evt_dup',
      orderId: 'chk_dup',
      session: { payment_status: 'paid', status: 'complete' },
      providerProofPresent: true,
      providerReference: 'RLY_OK',
      priorWebhookEventIds: ['evt_dup'],
    });
    const report = evaluateShadowSafetyGate(ctx);
    assertDiagnosticOnly(report);
    assert.equal(report.fulfillmentIntentAllowed, false);
    assert.equal(report.wiredPathReport.idempotencyDecision.decision, 'BLOCK_DUPLICATE');
  });

  it('paid + valid + unique → allowed dry-run diagnostic only', () => {
    const ctx = buildWebhookShadowContextFromRouteSnapshot({
      eventType: 'checkout.session.completed',
      eventId: 'evt_paid_ok',
      orderId: 'chk_paid_ok',
      session: { payment_status: 'paid', status: 'complete' },
      providerProofPresent: true,
      providerReference: 'RLY_OK',
    });
    const report = evaluateShadowSafetyGate(ctx);
    assertDiagnosticOnly(report);
    assert.equal(report.fulfillmentIntentAllowed, true);
  });
});

describe('L-79 webhook route wiring review', () => {
  it('boundary anchor documents L-79 feature-flag wiring', () => {
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.shadowWiredInL79, true);
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.defaultEnabled, false);
  });

  it('route calls shadow hook before scheduleFulfillmentProcessing (unchanged dispatch)', () => {
    const src = readFileSync(ROUTE_SRC, 'utf8');
    assert.match(src, /maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary/);
    const hookIdx = src.lastIndexOf('maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary');
    const schedIdx = src.indexOf('scheduleFulfillmentProcessing', hookIdx);
    assert.ok(schedIdx > hookIdx, 'scheduleFulfillmentProcessing must follow shadow hook');
  });
});
