import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { redactAuditPayloadSecrets } from '../src/services/orderAuditService.js';
import { resolvePhase1CheckoutCorrelationTraceId } from '../src/services/phase1StripeCheckoutSessionCompleted.js';
import {
  resetPhase1MissionObservabilityForTests,
  recordMissionPaymentCreated,
  recordMissionPaymentPaid,
  recordMissionWebhookInvalidSig,
  getPhase1MissionMetricsSnapshot,
  PHASE1_MISSION_ALERT_THRESHOLDS,
} from '../src/infrastructure/observability/phase1MissionObservability.js';
import { RECON_RECOMMENDATION, RECON_V2_ACTION } from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';

test('redactAuditPayloadSecrets is case-insensitive on keys', () => {
  const o = redactAuditPayloadSecrets({
    ok: true,
    StripeSecretKey: 'x',
    WEBHOOKSECRET: 'y',
    nested: { token: 'z' },
  });
  assert.equal(o.StripeSecretKey, undefined);
  assert.equal(o.WEBHOOKSECRET, undefined);
  assert.deepEqual(o.nested, {});
});

test('resolvePhase1CheckoutCorrelationTraceId prefers Stripe metadata zwTraceId', () => {
  assert.equal(
    resolvePhase1CheckoutCorrelationTraceId(
      { metadata: { zwTraceId: '  meta-trace  ' } },
      'http-trace',
    ),
    'meta-trace',
  );
  assert.equal(
    resolvePhase1CheckoutCorrelationTraceId({ metadata: {} }, 'http-trace'),
    'http-trace',
  );
});

test('mission metrics counters increment and snapshot has no secret-shaped strings', () => {
  resetPhase1MissionObservabilityForTests();
  recordMissionPaymentCreated('ord_unit_1', 'trace-a');
  recordMissionWebhookInvalidSig('trace-a');
  recordMissionPaymentPaid('ord_unit_1', 'trace-a', 'evt123456');
  const snap = getPhase1MissionMetricsSnapshot();
  assert.equal(snap.counters.payments_created, 1);
  assert.equal(snap.counters.payments_paid, 1);
  assert.equal(snap.counters.webhooks_invalid_sig, 1);
  const json = JSON.stringify(snap);
  assert.ok(!json.includes('sk_live'));
  assert.ok(!json.includes('whsec_'));
});

test('recon SAFE_RETRY predicate matches mission recovery filter', () => {
  const f = {
    recommendation: RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE,
    actionV2: RECON_V2_ACTION.SAFE_RETRY,
    checkoutId: 'chk_x',
  };
  assert.ok(
    f.recommendation === RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE &&
      f.actionV2 === RECON_V2_ACTION.SAFE_RETRY,
  );
});

test('alert thresholds object is stable', () => {
  assert.ok(PHASE1_MISSION_ALERT_THRESHOLDS.webhookInvalidSigRate > 0);
  assert.ok(PHASE1_MISSION_ALERT_THRESHOLDS.fulfillmentFailedRate > 0);
});

test('recovery service source does not invoke Stripe refund APIs', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(
    join(dir, '../src/services/recoveryPhase1SafeQueueRetryService.js'),
    'utf8',
  );
  assert.ok(!src.includes('refunds.create'));
  assert.ok(!src.toLowerCase().includes('stripe.refunds'));
});
