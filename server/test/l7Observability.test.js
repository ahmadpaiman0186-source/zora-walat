import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { PINO_HTTP_REDACT_PATHS } from '../src/config/loggingRedact.js';
import { emitMoneyPathLog } from '../src/infrastructure/logging/moneyPathLog.js';
import { sanitizePhase1ObservabilityFields } from '../src/infrastructure/logging/phase1ObservabilitySanitize.js';
import {
  emitL7MoneyPathSpan,
  L7_MONEY_PATH_SCHEMA,
} from '../src/infrastructure/logging/l7MoneyPathObservability.js';
import { emitResilienceStructuredLog } from '../src/utils/metrics.js';

describe('L7 money-path observability', () => {
  it('HTTP responses include X-Trace-Id for API requests', async () => {
    const app = createApp();
    const res = await request(app).get('/api/contract-test-missing-route-xyz');
    assert.ok(typeof res.headers['x-trace-id'] === 'string');
    assert.ok(String(res.headers['x-trace-id']).length > 8);
  });

  it('PINO_HTTP_REDACT_PATHS covers operator / webhook-sensitive headers', () => {
    const joined = PINO_HTTP_REDACT_PATHS.join('\n');
    assert.ok(joined.includes('x-admin-secret'));
    assert.ok(joined.includes('x-zw-dev-checkout'));
    assert.ok(joined.includes('stripe-signature'));
  });

  it('sanitizePhase1ObservabilityFields redacts email-ish keys and strips secrets', () => {
    const s = sanitizePhase1ObservabilityFields({
      userEmail: 'alice@example.com',
      emailVerified: true,
      note: 'token abc jwt x',
      deep: { authorization: 'Bearer x' },
    });
    assert.equal(s.emailVerified, true);
    assert.ok(String(s.userEmail).includes('@'));
    assert.ok(!String(s.userEmail).includes('alice'));
    assert.ok(!JSON.stringify(s).includes('Bearer'));
  });

  it('emitMoneyPathLog output is JSON and redacts secret-shaped substrings', () => {
    const logs = [];
    const done = mock.method(console, 'log', (line) => {
      logs.push(String(line));
    });
    try {
      emitMoneyPathLog('test_event', {
        traceId: 'trace-l7-unit',
        hint: 'prefix sk_test_1234567890 suffix',
      });
    } finally {
      done.mock.restore();
    }
    assert.equal(logs.length, 1);
    const obj = JSON.parse(logs[0]);
    assert.equal(obj.moneyPath, true);
    assert.equal(obj.event, 'test_event');
    assert.equal(obj.traceId, 'trace-l7-unit');
    assert.ok(!JSON.stringify(obj).includes('sk_test_'));
  });

  it('emitL7MoneyPathSpan includes schema + traceId + l7 flag', () => {
    const logs = [];
    const done = mock.method(console, 'log', (line) => {
      logs.push(String(line));
    });
    try {
      emitL7MoneyPathSpan({
        surface: 'ledger',
        stage: 'unit',
        outcome: 'ok',
        traceId: 'tid-1',
        refs: { x: 1 },
      });
    } finally {
      done.mock.restore();
    }
    const obj = JSON.parse(logs[0]);
    assert.equal(obj.l7, true);
    assert.equal(obj.schema, L7_MONEY_PATH_SCHEMA);
    assert.equal(obj.traceId, 'tid-1');
    assert.equal(obj.surface, 'ledger');
  });

  it('emitResilienceStructuredLog outputs JSON with schema and sanitizes extra', () => {
    const logs = [];
    const done = mock.method(console, 'log', (line) => {
      logs.push(String(line));
    });
    try {
      emitResilienceStructuredLog({
        stage: 'recovery',
        status: 'tick_complete',
        traceId: 'tid-res',
        extra: {
          userEmail: 'person@example.org',
          webhookSecret: 'whsec_should_not_appear',
          nested: { stripeSignature: 'sig_raw' },
        },
      });
    } finally {
      done.mock.restore();
    }
    const obj = JSON.parse(logs[0]);
    assert.equal(obj.moneyPathResilience, true);
    assert.equal(obj.schema, 'zora.resilience.v1');
    assert.equal(obj.stage, 'recovery');
    assert.equal(obj.status, 'tick_complete');
    assert.equal(obj.traceId, 'tid-res');
    assert.ok(String(obj.userEmail).includes('@'));
    assert.ok(!String(obj.userEmail).includes('person'));
    assert.ok(!JSON.stringify(obj).includes('whsec_'));
    assert.ok(!JSON.stringify(obj).includes('sig_raw'));
  });
});
