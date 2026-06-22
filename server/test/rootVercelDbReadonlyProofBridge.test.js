/**
 * Root Vercel deployment bridge for GET /ops/db-readonly-proof (L-85M-R5-R3F, L-85M-R5-R4F, L-85M-R5-R4G).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import rootDbReadonlyProofHandler from '../../api/ops/db-readonly-proof.mjs';
import { dbReadonlyProofInvariants } from '../src/lib/dbReadonlyProofContract.js';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRIDGE_SRC = join(repoRoot, 'api/ops/db-readonly-proof.mjs');
const OPS_TOKEN = 'ops-token-test-16chars-min';
const ROUTE = '/ops/db-readonly-proof';

function makeReq(method, url, headers = {}) {
  const stream = Readable.from([], { objectMode: false });
  stream.method = method;
  stream.url = url;
  stream.headers = headers;
  return /** @type {import('http').IncomingMessage} */ (
    /** @type {unknown} */ (stream)
  );
}

function makeMockRes() {
  const out = { statusCode: 0, body: null, headers: {} };
  const res = {
    headersSent: false,
    setHeader(key, val) {
      out.headers[String(key).toLowerCase()] = val;
    },
    status(code) {
      out.statusCode = code;
      return {
        json(payload) {
          out.body = payload;
          res.headersSent = true;
        },
      };
    },
  };
  return { out, res };
}

function assertNoSensitiveLeak(json) {
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.whsec));
  assert.ok(!json.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix));
  assert.ok(!json.includes('postgresql://'));
  assert.ok(!json.includes('Error:'));
  assert.ok(!json.includes('stack'));
}

describe('root Vercel db-readonly-proof bridge static review', () => {
  it('includes fail-closed sanitized error boundary around authenticated pass-through', () => {
    const src = readFileSync(BRIDGE_SRC, 'utf8');
    assert.match(src, /PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION/);
    assert.match(src, /runAuthenticatedPassThrough/);
    assert.match(src, /passThrough[\s\S]*catch/);
    assert.ok(!/err\.message/.test(src));
    assert.ok(!/err\.stack/.test(src));
  });

  it('registers serverless runtime and wires slim authenticated handler (L-85M-R5-R4G)', () => {
    const src = readFileSync(BRIDGE_SRC, 'utf8');
    assert.match(src, /registerServerlessRuntime/);
    assert.match(src, /slimDbReadonlyProofAuthenticatedHandler/);
    assert.ok(!/import\(['"].*bootstrap/.test(src), 'must not load bootstrap.js');
    assert.ok(!/createValidatedApp/.test(src), 'must not load createValidatedApp');
    assert.ok(!/getExpressHandler/.test(src), 'must not use getExpressHandler');
    assert.ok(!/serverless-http/.test(src), 'must not use serverless-http');
  });
});

describe('root Vercel db-readonly-proof bridge handler', () => {
  it('fails closed for unsupported methods', async () => {
    const { res, out } = makeMockRes();
    await rootDbReadonlyProofHandler(makeReq('POST', ROUTE), res);
    assert.equal(out.statusCode, 405);
    assert.equal(out.body.code, 'method_not_allowed');
  });

  it('preserves unauthenticated prebootstrap 401 BLOCKED JSON', async () => {
    const priorToken = process.env.OPS_HEALTH_TOKEN;
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;
    try {
      const { res, out } = makeMockRes();
      await rootDbReadonlyProofHandler(makeReq('GET', ROUTE), res);
      assert.equal(out.statusCode, 401);
      assert.equal(out.body.verdict, 'BLOCKED');
      assert.equal(out.body.reason, 'token_missing');
      assert.equal(out.body.prebootstrap_guard, true);
      assertNoSensitiveLeak(JSON.stringify(out.body));
    } finally {
      if (priorToken === undefined) delete process.env.OPS_HEALTH_TOKEN;
      else process.env.OPS_HEALTH_TOKEN = priorToken;
    }
  });

  it('returns sanitized JSON when authenticated pass-through throws', async () => {
    const priorToken = process.env.OPS_HEALTH_TOKEN;
    const priorReadonly = process.env.READ_ONLY_DATABASE_URL;
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;
    process.env.READ_ONLY_DATABASE_URL = 'postgresql://readonly-audit@example.invalid/neondb';
    globalThis.__zwProofBridgePassThroughImplForTest = async () => {
      throw new Error('synthetic_bridge_runtime_failure_with_secret_postgresql://leak');
    };
    try {
      const { res, out } = makeMockRes();
      await rootDbReadonlyProofHandler(
        makeReq('GET', ROUTE, { authorization: `Bearer ${OPS_TOKEN}` }),
        res,
      );
      assert.equal(out.statusCode, 503);
      assert.equal(out.body.classification, 'PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION');
      assert.equal(out.body.reason, 'proof_route_bridge_runtime_exception');
      assert.equal(out.body.verdict, 'BLOCKED');
      assert.equal(out.body.runtime_db_identity_proof, false);
      assert.equal(out.body.secret_disclosure, false);
      assertNoSensitiveLeak(JSON.stringify(out.body));
    } finally {
      delete globalThis.__zwProofBridgePassThroughImplForTest;
      if (priorToken === undefined) delete process.env.OPS_HEALTH_TOKEN;
      else process.env.OPS_HEALTH_TOKEN = priorToken;
      if (priorReadonly === undefined) delete process.env.READ_ONLY_DATABASE_URL;
      else process.env.READ_ONLY_DATABASE_URL = priorReadonly;
    }
  });

  it('authenticated pass-through uses slim handler JSON without bootstrap (L-85M-R5-R4G)', async () => {
    const priorToken = process.env.OPS_HEALTH_TOKEN;
    const priorReadonly = process.env.READ_ONLY_DATABASE_URL;
    process.env.OPS_HEALTH_TOKEN = OPS_TOKEN;
    process.env.READ_ONLY_DATABASE_URL = 'postgresql://readonly-audit@example.invalid/neondb';
    globalThis.__zwSlimDbReadonlyProofExecuteForTest = async () => ({
      httpStatus: 503,
      body: {
        ...dbReadonlyProofInvariants(),
        verdict: 'FAIL',
        fail_reason: 'db_connect_failed',
        checked_at: new Date().toISOString(),
        readonly_role_expected: false,
        database_expected: false,
        role_superuser_false: false,
        role_createdb_false: false,
        role_createrole_false: false,
        scoped_tables_checked_count: 0,
        select_allowed_all_scoped_tables: false,
        write_denied_all_scoped_tables: false,
      },
    });
    try {
      const { res, out } = makeMockRes();
      await rootDbReadonlyProofHandler(
        makeReq('GET', ROUTE, { authorization: `Bearer ${OPS_TOKEN}` }),
        res,
      );
      assert.equal(out.statusCode, 503);
      assert.equal(out.body.verdict, 'FAIL');
      assert.equal(out.body.fail_reason, 'db_connect_failed');
      assert.equal(out.body.secret_disclosure, false);
      assert.equal(out.body.owner_database_url_fallback_used, false);
      assert.equal(out.body.no_rows_exported, true);
      assert.equal(out.body.write_probe_occurred, undefined);
      assertNoSensitiveLeak(JSON.stringify(out.body));
    } finally {
      delete globalThis.__zwSlimDbReadonlyProofExecuteForTest;
      if (priorToken === undefined) delete process.env.OPS_HEALTH_TOKEN;
      else process.env.OPS_HEALTH_TOKEN = priorToken;
      if (priorReadonly === undefined) delete process.env.READ_ONLY_DATABASE_URL;
      else process.env.READ_ONLY_DATABASE_URL = priorReadonly;
    }
  });
});
