/**
 * Local proof: mission metrics, trace carry-over, redaction, simulated ALERT.
 * Optional DB recovery dispatch: set `ZW_PROOF_INCLUDE_DB_RECOVERY=true` (can nudge real dev rows).
 *
 * Run: npm --prefix server run proof:observability-local
 */
import '../bootstrap.js';

import assert from 'node:assert/strict';

import { redactAuditPayloadSecrets } from '../src/services/orderAuditService.js';
import { resolvePhase1CheckoutCorrelationTraceId } from '../src/services/phase1StripeCheckoutSessionCompleted.js';
import {
  resetPhase1MissionObservabilityForTests,
  recordMissionPaymentCreated,
  recordMissionPaymentPaid,
  recordMissionWebhookReceived,
  getPhase1MissionMetricsSnapshot,
  simulateMissionWebhookFailuresForProof,
  emitPhase1MissionStructuredLog,
  PHASE1_MISSION_LOG_SCHEMA,
} from '../src/infrastructure/observability/phase1MissionObservability.js';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'observability_local', ...obj }));
}

async function main() {
  resetPhase1MissionObservabilityForTests();

  const checkoutTrace = `proof-trace-${Date.now()}`;
  const sessionLike = {
    metadata: {
      internalCheckoutId: 'chk_proof_1',
      zwTraceId: checkoutTrace,
    },
  };
  assert.equal(
    resolvePhase1CheckoutCorrelationTraceId(sessionLike, 'req-fallback'),
    checkoutTrace,
  );
  assert.equal(
    resolvePhase1CheckoutCorrelationTraceId({ metadata: {} }, 'req-only'),
    'req-only',
  );

  const r1 = redactAuditPayloadSecrets({
    orderId: 'x',
    TOKEN: 'should-strip',
    password: 'y',
  });
  assert.equal(r1.TOKEN, undefined);
  assert.equal(r1.password, undefined);

  recordMissionPaymentCreated('chk_proof_1', checkoutTrace);
  recordMissionWebhookReceived(checkoutTrace, 'evt12ab34');
  recordMissionPaymentPaid('chk_proof_1', checkoutTrace, 'evt12ab34');

  const snap = getPhase1MissionMetricsSnapshot();
  assert.equal(snap.counters.payments_created, 1);
  assert.equal(snap.counters.payments_paid, 1);
  assert.equal(snap.counters.webhooks_received, 1);
  assert.ok(!JSON.stringify(snap).includes('sk_live'));
  assert.ok(!JSON.stringify(snap).includes('whsec_'));

  const origLog = console.log;
  const alertLines = [];
  console.log = (msg) => {
    alertLines.push(String(msg));
    origLog(msg);
  };
  try {
    simulateMissionWebhookFailuresForProof(40);
  } finally {
    console.log = origLog;
  }
  assert.ok(
    alertLines.some((l) => l.includes('"ALERT":true')),
    'expected ALERT JSON line from simulated webhook invalid rate',
  );

  const redactLines = [];
  console.log = (msg) => {
    redactLines.push(String(msg));
    origLog(msg);
  };
  try {
    emitPhase1MissionStructuredLog({
      subsystem: 'checkout',
      stage: 'proof_extra',
      outcome: 'ok',
      traceId: checkoutTrace,
      orderId: 'chk_proof_1',
      checkoutId: 'chk_proof_1',
      eventIdSuffix: null,
      latencyMs: null,
      extra: { ApiKey: 'should-redact-key' },
    });
  } finally {
    console.log = origLog;
  }
  const joinedRedact = redactLines.join('\n');
  assert.ok(
    !joinedRedact.includes('ApiKey') && !joinedRedact.includes('apikey'),
    'deny-listed keys must not appear in structured log',
  );

  const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
  const runDbRecovery =
    dbUrl &&
    String(process.env.ZW_PROOF_INCLUDE_DB_RECOVERY ?? '')
      .trim()
      .toLowerCase() === 'true';
  if (runDbRecovery) {
    const { executePhase1RecoveryScanOnce } = await import(
      '../src/services/recoveryPhase1SafeQueueRetryService.js'
    );
    const rec = await executePhase1RecoveryScanOnce({
      traceId: 'proof-recovery',
      limit: 5,
    });
    assert.equal(typeof rec.uniqueRequeued, 'number');
    assert.ok(!JSON.stringify(rec).toLowerCase().includes('refund'));
  }

  proofLine({
    ok: true,
    schema: PHASE1_MISSION_LOG_SCHEMA,
    checkoutTraceContinuity: checkoutTrace,
    metricsSnapshot: snap,
    recoveryExercised: runDbRecovery,
  });
}

main().catch((e) => {
  proofLine({ ok: false, error: String(e?.message ?? e) });
  process.exitCode = 1;
});
