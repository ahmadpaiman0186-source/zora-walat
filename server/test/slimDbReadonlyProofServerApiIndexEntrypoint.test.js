/**
 * Production server/api/index.mjs slim DB-readonly-proof routing (L-86B).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { dbReadonlyProofInvariants } from '../src/lib/dbReadonlyProofContract.js';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = join(__dirname, '../api/index.mjs');
const OPS_TOKEN = 'ops-token-test-16chars-min';

const PROOF_ROUTES = ['/ops/db-readonly-proof', '/api/admin/ops/db-readonly-proof'];

function extractDbReadonlyProofIndexBlock(src) {
  const marker = 'Read-only DB proof: fail closed before bootstrap';
  const start = src.indexOf(marker);
  assert.ok(start > 0, 'expected db-readonly-proof block in index.mjs');
  const end = src.indexOf('slimStripeWebhookHandler', start);
  assert.ok(end > start, 'expected stripe webhook block after proof block');
  return src.slice(start, end);
}

function createMockRes() {
  let statusCode = null;
  const headers = {};
  let body = null;
  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    headersSent: false,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      this.headersSent = true;
      return this;
    },
    end() {
      this.headersSent = true;
    },
  };
}

function assertNoSensitiveLeak(json) {
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.whsec));
  assert.ok(!json.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix));
  assert.ok(!json.includes('postgresql://'));
  assert.ok(!json.includes('Error:'));
  assert.ok(!json.includes('stack'));
}

describe('server api/index.mjs db-readonly-proof static review (L-86B)', () => {
  it('wires slim authenticated handler and bypasses getHandler for proof pass-through', () => {
    const block = extractDbReadonlyProofIndexBlock(readFileSync(INDEX_SRC, 'utf8'));
    assert.match(block, /slimDbReadonlyProofAuthenticatedHandler/);
    assert.match(block, /handleSlimDbReadonlyProofAuthenticatedGet/);
    assert.match(block, /\/ops\/db-readonly-proof/);
    assert.match(block, /\/api\/admin\/ops\/db-readonly-proof/);
    assert.ok(!/getHandler\(\)/.test(block), 'proof block must not call getHandler()');
    assert.ok(!/createValidatedApp/.test(block), 'proof block must not load createValidatedApp');
    assert.ok(!/\.\.\/bootstrap\.js/.test(block), 'proof block must not load bootstrap.js');
  });

  it('includes fail-closed sanitized error boundary around authenticated pass-through', () => {
    const block = extractDbReadonlyProofIndexBlock(readFileSync(INDEX_SRC, 'utf8'));
    assert.match(block, /PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION/);
    assert.match(block, /passThrough[\s\S]*catch/);
    assert.ok(!/err\.message/.test(block));
    assert.ok(!/err\.stack/.test(block));
  });
});

describe('server api/index.mjs db-readonly-proof handler (L-86B)', () => {
  for (const route of PROOF_ROUTES) {
    it(`GET ${route} authenticated path does not import bootstrap`, async () => {
      const loaded = [];
      const priorToken = process.env.OPS_HEALTH_TOKEN;
      const priorReadonly = process.env.READ_ONLY_DATABASE_URL;
      process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;
      process.env.READ_ONLY_DATABASE_URL = 'postgresql://readonly-audit@example.invalid/neondb';
      globalThis.__zwServerlessHealthTestHook = (event) => loaded.push(event);
      globalThis.__zwSlimDbReadonlyProofExecuteForTest = async () => ({
        httpStatus: 200,
        body: {
          ...dbReadonlyProofInvariants(),
          verdict: 'PASS',
          checked_at: new Date().toISOString(),
          readonly_role_expected: true,
          database_expected: true,
          role_superuser_false: true,
          role_createdb_false: true,
          role_createrole_false: true,
          scoped_tables_checked_count: 6,
          select_allowed_all_scoped_tables: true,
          write_denied_all_scoped_tables: true,
        },
      });
      try {
        const { default: handler } = await import('../api/index.mjs');
        const res = createMockRes();
        await handler(
          { method: 'GET', url: route, headers: { authorization: `Bearer ${OPS_TOKEN}` } },
          res,
        );
        assert.deepEqual(loaded, []);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.verdict, 'PASS');
        assert.equal(res.body.owner_database_url_fallback_used, false);
        assert.equal(res.body.no_rows_exported, true);
        assertNoSensitiveLeak(JSON.stringify(res.body));
      } finally {
        delete globalThis.__zwServerlessHealthTestHook;
        delete globalThis.__zwSlimDbReadonlyProofExecuteForTest;
        if (priorToken === undefined) delete process.env.OPS_HEALTH_TOKEN;
        else process.env.OPS_HEALTH_TOKEN = priorToken;
        if (priorReadonly === undefined) delete process.env.READ_ONLY_DATABASE_URL;
        else process.env.READ_ONLY_DATABASE_URL = priorReadonly;
      }
    });

    it(`GET ${route} preserves unauthenticated prebootstrap 401 BLOCKED JSON`, async () => {
      const priorToken = process.env.OPS_HEALTH_TOKEN;
      process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;
      try {
        const { default: handler } = await import('../api/index.mjs');
        const res = createMockRes();
        await handler({ method: 'GET', url: route, headers: {} }, res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.verdict, 'BLOCKED');
        assert.equal(res.body.reason, 'token_missing');
        assert.equal(res.body.prebootstrap_guard, true);
        assert.equal(res.body.owner_database_url_fallback_used, false);
        assert.equal(res.body.row_export_occurred, false);
        assert.equal(res.body.write_probe_occurred, false);
        assert.equal(res.body.secret_disclosure, false);
        assertNoSensitiveLeak(JSON.stringify(res.body));
      } finally {
        if (priorToken === undefined) delete process.env.OPS_HEALTH_TOKEN;
        else process.env.OPS_HEALTH_TOKEN = priorToken;
      }
    });

    it(`GET ${route} returns sanitized JSON when authenticated pass-through throws`, async () => {
      const priorToken = process.env.OPS_HEALTH_TOKEN;
      const priorReadonly = process.env.READ_ONLY_DATABASE_URL;
      process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;
      process.env.READ_ONLY_DATABASE_URL = 'postgresql://readonly-audit@example.invalid/neondb';
      globalThis.__zwProofBridgePassThroughImplForTest = async () => {
        throw new Error('synthetic_bridge_runtime_failure_with_secret_postgresql://leak');
      };
      try {
        const { default: handler } = await import('../api/index.mjs');
        const res = createMockRes();
        await handler(
          { method: 'GET', url: route, headers: { authorization: `Bearer ${OPS_TOKEN}` } },
          res,
        );
        assert.equal(res.statusCode, 503);
        assert.equal(res.body.classification, 'PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION');
        assert.equal(res.body.verdict, 'BLOCKED');
        assert.equal(res.body.secret_disclosure, false);
        assert.equal(res.body.owner_database_url_fallback_used, false);
        assert.equal(res.body.db_query_performed, false);
        assertNoSensitiveLeak(JSON.stringify(res.body));
      } finally {
        delete globalThis.__zwProofBridgePassThroughImplForTest;
        if (priorToken === undefined) delete process.env.OPS_HEALTH_TOKEN;
        else process.env.OPS_HEALTH_TOKEN = priorToken;
        if (priorReadonly === undefined) delete process.env.READ_ONLY_DATABASE_URL;
        else process.env.READ_ONLY_DATABASE_URL = priorReadonly;
      }
    });
  }
});
