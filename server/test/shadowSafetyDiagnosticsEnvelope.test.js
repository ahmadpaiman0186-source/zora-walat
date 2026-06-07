/**
 * L-80 sanitized shadow diagnostics envelope — redaction and log safety (no DB, no network).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSanitizedShadowDiagnosticsEnvelope,
  evaluateShadowSafetyGate,
  fingerprintCorrelation,
  isShadowSafetyGateWebhookDiagnosticsEnabled,
  maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary,
  redactSensitiveString,
  serializeSanitizedEnvelopeForLog,
  SANITIZED_SHADOW_DIAGNOSTICS_ENVELOPE_VERSION,
  WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR,
} from '../src/reliability/shadowSafetyGate/index.js';
import { paidValidUniqueAllowsDryRunIntent } from './fixtures/shadowSafetyGate/scenarios.mjs';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
  sensitiveRequestHeaders,
  sensitiveStripeEvent,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const enabledEnv = { shadowSafetyGateWebhookDiagnosticsEnabled: true };
const disabledEnv = { shadowSafetyGateWebhookDiagnosticsEnabled: false };
const FIXED_TIME = '2026-06-07T15:18:00.000Z';

function envelopeJson(envelope) {
  return JSON.stringify(serializeSanitizedEnvelopeForLog(envelope));
}

function assertNoSensitiveLeak(json, material = SENSITIVE_LEAK_MATERIAL) {
  assert.ok(!json.includes(material.whsec), 'must not leak whsec');
  assert.ok(!json.includes(material.skLive), 'must not leak sk_live');
  assert.ok(!json.includes(material.skTest), 'must not leak sk_test');
  assert.ok(!json.includes(material.bearer), 'must not leak bearer token');
  assert.ok(!json.includes(material.webhookUrl), 'must not leak webhook URL');
  assert.ok(!json.includes(material.acctId), 'must not leak acct_ id');
  assert.ok(!json.includes(material.evtId), 'must not leak evt_ id');
  assert.ok(!json.includes(material.cusId), 'must not leak cus_ id');
  assert.ok(!json.includes(material.csId), 'must not leak cs_ id');
  assert.ok(!json.includes(material.email), 'must not leak email');
  assert.ok(!json.includes(material.phone.replace(/\D/g, '')), 'must not leak phone digits');
  assert.ok(!json.includes('customer_details'), 'must not include raw payload fields');
  assert.ok(!json.includes('stripe-signature'), 'must not include request headers');
  assert.ok(!json.includes('authorization'), 'must not include request headers');
}

describe('L-80 redactSensitiveString', () => {
  it('redacts whsec_', () => {
    const out = redactSensitiveString(SENSITIVE_LEAK_MATERIAL.whsec);
    assert.ok(!out.includes(SENSITIVE_LEAK_MARKERS.whsecTier));
    assert.match(out, /\[redacted_secret\]/);
  });

  it('redacts API keys and Bearer tokens', () => {
    const out = redactSensitiveString(
      `${SENSITIVE_LEAK_MATERIAL.skLive} ${SENSITIVE_LEAK_MATERIAL.bearer}`,
    );
    assert.ok(!out.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix));
    assert.match(out, /\[redacted_secret\]/);
    assert.match(out, /\[redacted_bearer\]/);
  });

  it('redacts full webhook URLs', () => {
    const out = redactSensitiveString(SENSITIVE_LEAK_MATERIAL.webhookUrl);
    assert.ok(!out.includes('https://'));
    assert.match(out, /\[redacted_url\]/);
  });

  it('redacts Stripe-style IDs', () => {
    const raw = `${SENSITIVE_LEAK_MATERIAL.acctId} ${SENSITIVE_LEAK_MATERIAL.evtId} ${SENSITIVE_LEAK_MATERIAL.cusId} ${SENSITIVE_LEAK_MATERIAL.csId}`;
    const out = redactSensitiveString(raw);
    assert.ok(!out.includes('acct_'));
    assert.ok(!out.includes('evt_'));
    assert.ok(!out.includes('cus_'));
    assert.ok(!out.includes(SENSITIVE_LEAK_MARKERS.csTestPrefix));
  });

  it('redacts email and phone PII', () => {
    const out = redactSensitiveString(
      `contact ${SENSITIVE_LEAK_MATERIAL.email} ${SENSITIVE_LEAK_MATERIAL.phone}`,
    );
    assert.ok(!out.includes('@example.com'));
    assert.match(out, /\[redacted_email\]/);
    assert.match(out, /\[redacted_phone\]/);
  });
});

describe('L-80 sanitized envelope builder', () => {
  it('never includes raw Stripe payload fields', () => {
    const report = evaluateShadowSafetyGate(paidValidUniqueAllowsDryRunIntent);
    const envelope = buildSanitizedShadowDiagnosticsEnvelope({
      report,
      shadowModeEnabled: true,
      correlationMaterial: {
        orderId: SENSITIVE_LEAK_MATERIAL.csId,
        eventId: SENSITIVE_LEAK_MATERIAL.evtId,
        eventType: sensitiveStripeEvent.type,
      },
      evaluatedAt: FIXED_TIME,
    });
    const json = envelopeJson(envelope);
    assertNoSensitiveLeak(json);
    assert.ok(!json.includes('"data"'));
    assert.ok(!json.includes('payment_status'));
  });

  it('preserves safe correlation through fingerprint', () => {
    const a = fingerprintCorrelation(['checkout.session.completed', 'ord_a', 'evt_a']);
    const b = fingerprintCorrelation(['checkout.session.completed', 'ord_a', 'evt_a']);
    const c = fingerprintCorrelation(['checkout.session.completed', 'ord_b', 'evt_a']);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^[a-f0-9]{16}$/);
  });

  it('includes only bounded safe fields', () => {
    const report = evaluateShadowSafetyGate(paidValidUniqueAllowsDryRunIntent);
    const envelope = buildSanitizedShadowDiagnosticsEnvelope({
      report,
      shadowModeEnabled: true,
      evaluatedAt: FIXED_TIME,
    });
    assert.equal(envelope.envelopeVersion, SANITIZED_SHADOW_DIAGNOSTICS_ENVELOPE_VERSION);
    assert.equal(envelope.wouldScheduleFulfillment, false);
    assert.equal(envelope.liveRouteEnforcement, false);
    assert.equal(envelope.diagnosticsOnly, true);
    assert.ok(Array.isArray(envelope.reasonCodes));
    assert.ok(envelope.correlationFingerprint);
    assert.ok(['ALLOW', 'BLOCK'].includes(envelope.verdict));
  });

  it('blocked unpaid scenario → BLOCK verdict with reason codes', () => {
    const report = evaluateShadowSafetyGate({
      ...paidValidUniqueAllowsDryRunIntent,
      scenarioId: 'unpaid_shadow',
      sessionPaymentStatus: 'unpaid',
      stripePaid: false,
      webhookPaymentReceived: false,
      paymentCheckoutStatus: 'PENDING',
    });
    const envelope = buildSanitizedShadowDiagnosticsEnvelope({
      report,
      shadowModeEnabled: true,
      evaluatedAt: FIXED_TIME,
    });
    assert.equal(envelope.verdict, 'BLOCK');
    assert.equal(envelope.wouldScheduleFulfillment, false);
    assert.ok(envelope.reasonCodes.length > 0);
  });
});

describe('L-80 boundary hook with sanitized envelope', () => {
  it('disabled/default mode remains no-op', () => {
    const result = maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary({
      event: sensitiveStripeEvent,
      orderId: SENSITIVE_LEAK_MATERIAL.csId,
      envConfig: disabledEnv,
      log: { info: () => assert.fail('must not log when disabled') },
    });
    assert.equal(result, null);
    assert.equal(isShadowSafetyGateWebhookDiagnosticsEnabled({}), false);
  });

  it('enabled shadow mode emits sanitized diagnostics only', () => {
    let loggedPayload;
    const report = maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary({
      event: sensitiveStripeEvent,
      orderId: SENSITIVE_LEAK_MATERIAL.csId,
      envConfig: enabledEnv,
      log: {
        info: (payload) => {
          loggedPayload = payload;
        },
      },
    });
    assert(report);
    assert.equal(report.wouldScheduleFulfillment, false);
    assert(loggedPayload);
    assert.equal(loggedPayload.event, 'shadow_safety_gate_webhook_diagnostic');
    assert(loggedPayload.envelope);
    assertNoSensitiveLeak(JSON.stringify(loggedPayload));
    assert.equal(loggedPayload.envelope.wouldScheduleFulfillment, false);
    assert.equal(loggedPayload.envelope.shadowModeEnabled, true);
    assert.ok(!Object.hasOwn(loggedPayload, 'orderIdSuffix'));
  });

  it('does not include request headers in log payload', () => {
    let loggedPayload;
    maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary({
      event: sensitiveStripeEvent,
      orderId: 'internal_order_ref',
      envConfig: enabledEnv,
      log: { info: (payload) => { loggedPayload = payload; } },
    });
  // headers are not passed to hook — verify envelope path ignores them
    const json = JSON.stringify(loggedPayload);
    for (const key of Object.keys(sensitiveRequestHeaders)) {
      assert.ok(!json.includes(sensitiveRequestHeaders[key]));
    }
  });
});

describe('L-80 boundary anchor', () => {
  it('documents L-80 sanitized envelope wiring', () => {
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.sanitizedEnvelopeInL80, true);
    assert.equal(WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR.defaultEnabled, false);
  });
});
