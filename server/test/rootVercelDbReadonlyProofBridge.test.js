/**
 * Root Vercel deployment bridge for GET /ops/db-readonly-proof (L-85M-R5-R3F, L-85M-R5-R4F).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import rootDbReadonlyProofHandler from '../../api/ops/db-readonly-proof.mjs';
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

  it('registers serverless runtime before bootstrap pass-through (L-85M-R5-R4F parity)', () => {
    const src = readFileSync(BRIDGE_SRC, 'utf8');
    assert.match(src, /registerServerlessRuntime/);
    const regIdx = src.indexOf('registerServerlessRuntime');
    const bootstrapIdx = src.indexOf("import('../../server/bootstrap.js')");
    assert.notEqual(regIdx, -1);
    assert.notEqual(bootstrapIdx, -1);
    assert.ok(regIdx < bootstrapIdx, 'registerServerlessRuntime must precede bootstrap import');
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
});
