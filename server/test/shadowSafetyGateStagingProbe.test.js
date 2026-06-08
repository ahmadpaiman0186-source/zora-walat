/**
 * L-83A staging probe diagnostics — adapter, gating, route boundary (no DB, no network).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  STAGING_PROBE_FIXED_SCENARIO,
  STAGING_PROBE_ID,
  emitStagingProbeShadowDiagnostic,
  isStagingProbeRouteAllowed,
} from '../src/reliability/shadowSafetyGate/stagingProbeDiagnostics.js';
import { evaluateShadowSafetyGate } from '../src/reliability/shadowSafetyGate/evaluate.js';
import { serializeSanitizedEnvelopeForLog } from '../src/reliability/shadowSafetyGate/sanitizedDiagnosticsEnvelope.js';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADAPTER_SRC = join(
  __dirname,
  '../src/reliability/shadowSafetyGate/stagingProbeDiagnostics.js',
);
const ROUTE_SRC = join(
  __dirname,
  '../src/routes/internalShadowSafetyGateStagingProbe.routes.js',
);

const OPS_TOKEN = 'ops-token-test-16chars-min';
const stagingEnabledEnv = {
  shadowSafetyGateStagingProbeEnabled: true,
  zwApiDeploymentTier: 'staging',
  opsInfraHealthToken: OPS_TOKEN,
};
const gatesOffEnv = {
  shadowSafetyGateStagingProbeEnabled: false,
  zwApiDeploymentTier: 'staging',
  opsInfraHealthToken: OPS_TOKEN,
};
const productionTierEnv = {
  shadowSafetyGateStagingProbeEnabled: true,
  zwApiDeploymentTier: 'production',
  opsInfraHealthToken: OPS_TOKEN,
};

const FIXED_TIME = '2026-06-08T16:00:00.000Z';

function assertNoSensitiveLeak(json) {
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.whsec), 'must not leak whsec');
  assert.ok(!json.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix), 'must not leak sk_live');
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.email), 'must not leak email');
}

describe('L-83A staging probe gate resolver', () => {
  it('fail closed when probe flag off', () => {
    assert.equal(isStagingProbeRouteAllowed(gatesOffEnv), false);
    assert.equal(isStagingProbeRouteAllowed({}), false);
  });

  it('fail closed when tier is not staging', () => {
    assert.equal(isStagingProbeRouteAllowed(productionTierEnv), false);
    assert.equal(
      isStagingProbeRouteAllowed({
        shadowSafetyGateStagingProbeEnabled: true,
        zwApiDeploymentTier: '',
      }),
      false,
    );
  });

  it('allows only when both probe flag and staging tier are set', () => {
    assert.equal(isStagingProbeRouteAllowed(stagingEnabledEnv), true);
  });
});

describe('L-83A staging probe adapter', () => {
  it('returns gates_closed when disabled', () => {
    const result = emitStagingProbeShadowDiagnostic({
      envConfig: gatesOffEnv,
      log: { info: () => assert.fail('must not log') },
    });
    assert.equal(result.emitted, false);
    assert.equal(result.reason, 'gates_closed');
  });

  it('emits exactly one sanitized diagnostic log when enabled', () => {
    /** @type {unknown[]} */
    const logs = [];
    const result = emitStagingProbeShadowDiagnostic({
      envConfig: stagingEnabledEnv,
      evaluatedAt: FIXED_TIME,
      log: {
        info: (payload) => {
          logs.push(payload);
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.emitted, true);
    assert.equal(result.probeId, STAGING_PROBE_ID);
    assert.equal(typeof result.correlationFingerprint, 'string');
    assert.equal(logs.length, 1);

    const payload = /** @type {{ event: string, envelope: object }} */ (logs[0]);
    assert.equal(payload.event, 'shadow_safety_gate_webhook_diagnostic');
    assert.equal(payload.envelope.component, 'shadow_safety_gate_staging_probe');
    assert.equal(payload.envelope.diagnosticsOnly, true);
    assert.equal(payload.envelope.wouldScheduleFulfillment, false);
    assert.equal(payload.envelope.liveRouteEnforcement, false);
    assert.equal(typeof payload.envelope.timestamp, 'string');

    assertNoSensitiveLeak(JSON.stringify(serializeSanitizedEnvelopeForLog(payload.envelope)));
  });

  it('uses fixed synthetic scenario only', () => {
    assert.equal(STAGING_PROBE_FIXED_SCENARIO.mode, 'shadow');
    assert.equal(STAGING_PROBE_FIXED_SCENARIO.boundary, 'staging_probe');
    assert.match(STAGING_PROBE_FIXED_SCENARIO.orderId, /^l83a_probe_/);

    const report = evaluateShadowSafetyGate(STAGING_PROBE_FIXED_SCENARIO);
    assert(report);
    assert.equal(report.mutations.db, false);
    assert.equal(report.mutations.fulfillmentScheduled, false);
    assert.equal(report.mutations.provider, false);
    assert.equal(report.mutations.stripe, false);
  });
});

describe('L-83A import boundary static review', () => {
  it('adapter source avoids stripe/db/provider/fulfillment imports', () => {
    const src = readFileSync(ADAPTER_SRC, 'utf8');
    assert.ok(!/\bfrom ['"].*stripe/i.test(src));
    assert.ok(!/\bprisma\b/i.test(src));
    assert.ok(!/scheduleFulfillmentProcessing/.test(src));
    assert.ok(!/maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary/.test(src));
    assert.match(src, /evaluateShadowSafetyGate/);
    assert.match(src, /buildSanitizedShadowDiagnosticsEnvelope/);
  });

  it('route source avoids stripe webhook and money-path imports', () => {
    const src = readFileSync(ROUTE_SRC, 'utf8');
    assert.ok(!/stripeWebhook/.test(src));
    assert.ok(!/\bprisma\b/i.test(src));
    assert.ok(!/scheduleFulfillmentProcessing/.test(src));
    assert.match(src, /opsInfraHealthTokenMatches/);
    assert.match(src, /emitStagingProbeShadowDiagnostic/);
  });
});

describe('L-83A route HTTP (dynamic import after env)', () => {
  async function mountProbeApp() {
    const express = (await import('express')).default;
    const request = (await import('supertest')).default;
    const { default: probeRouter } = await import(
      '../src/routes/internalShadowSafetyGateStagingProbe.routes.js'
    );

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.log = { info: () => {} };
      next();
    });
    app.use('/internal', probeRouter);
    return { app, request };
  }

  it('POST success emits diagnostic and returns bounded JSON', async () => {
    process.env.SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED = 'true';
    process.env.ZW_API_DEPLOYMENT_TIER = 'staging';
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;

    const { app, request } = await mountProbeApp();

    const res = await request(app)
      .post('/internal/staging/shadow-safety-gate/diagnostic-probe')
      .set('Authorization', `Bearer ${OPS_TOKEN}`)
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.emitted, true);
    assert.equal(res.body.probeId, STAGING_PROBE_ID);
    assert.equal(typeof res.body.correlationFingerprint, 'string');
    assert.equal(res.body.envelope, undefined);
  });

  it('returns 404 when gates off', async () => {
    process.env.SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED = 'false';
    process.env.ZW_API_DEPLOYMENT_TIER = 'staging';
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;

    const { app, request } = await mountProbeApp();

    const res = await request(app)
      .post('/internal/staging/shadow-safety-gate/diagnostic-probe')
      .set('Authorization', `Bearer ${OPS_TOKEN}`)
      .send();

    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'not_found');
  });

  it('returns 401 without token', async () => {
    process.env.SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED = 'true';
    process.env.ZW_API_DEPLOYMENT_TIER = 'staging';
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;

    const { app, request } = await mountProbeApp();

    const res = await request(app)
      .post('/internal/staging/shadow-safety-gate/diagnostic-probe')
      .send();

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'unauthorized');
  });

  it('returns 400 when JSON body is non-empty', async () => {
    process.env.SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED = 'true';
    process.env.ZW_API_DEPLOYMENT_TIER = 'staging';
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;

    const { app, request } = await mountProbeApp();

    const res = await request(app)
      .post('/internal/staging/shadow-safety-gate/diagnostic-probe')
      .set('Authorization', `Bearer ${OPS_TOKEN}`)
      .send({ probe: true });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'body_not_allowed');
  });

  it('returns 404 on production tier even when probe flag true', async () => {
    process.env.SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED = 'true';
    process.env.ZW_API_DEPLOYMENT_TIER = 'production';
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;

    const { app, request } = await mountProbeApp();

    const res = await request(app)
      .post('/internal/staging/shadow-safety-gate/diagnostic-probe')
      .set('Authorization', `Bearer ${OPS_TOKEN}`)
      .send();

    assert.equal(res.status, 404);
  });
});
