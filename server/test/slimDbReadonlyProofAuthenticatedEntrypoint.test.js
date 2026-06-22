/**
 * Slim authenticated DB-readonly-proof handler (L-85M-R5-R4G).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS,
  dbReadonlyProofInvariants,
} from '../src/lib/dbReadonlyProofContract.js';
import { handleSlimDbReadonlyProofAuthenticatedGet } from '../handlers/slimDbReadonlyProofAuthenticatedHandler.mjs';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDLER_SRC = join(__dirname, '../handlers/slimDbReadonlyProofAuthenticatedHandler.mjs');
const SERVICE_SRC = join(__dirname, '../src/services/dbReadonlyProofService.js');

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
  };
}

function assertNoSensitiveLeak(json) {
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.whsec));
  assert.ok(!json.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix));
  assert.ok(!json.includes('postgresql://'));
  assert.ok(!json.includes('Error:'));
  assert.ok(!json.includes('stack'));
}

describe('slim authenticated db-readonly-proof handler static review', () => {
  it('does not import full app cold-start modules', () => {
    const src = readFileSync(HANDLER_SRC, 'utf8');
    assert.ok(!/import\(['"].*bootstrap/.test(src));
    assert.ok(!/createValidatedApp/.test(src));
    assert.ok(!/serverless-http/.test(src));
    assert.match(src, /executeDbReadonlyProof/);
  });

  it('proof service resolves READ_ONLY_DATABASE_URL only (no owner DATABASE_URL fallback)', () => {
    const src = readFileSync(SERVICE_SRC, 'utf8');
    assert.ok(!/\bfrom ['"].*\/db\.js['"]/.test(src));
    assert.ok(!/process\.env\.DATABASE_URL/.test(src));
    assert.match(src, /READ_ONLY_DATABASE_URL/);
    assert.match(src, /createReadonlyProofPrismaClient/);
  });
});

describe('slim authenticated db-readonly-proof handler', () => {
  it('returns JSON FAIL 503 from executeDbReadonlyProof result', async () => {
    const res = createMockRes();
    const req = { headers: { authorization: 'Bearer test' } };
    await handleSlimDbReadonlyProofAuthenticatedGet(req, res, {
      executeProof: async () => ({
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
      }),
    });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.verdict, 'FAIL');
    assert.equal(res.body.fail_reason, 'db_connect_failed');
    assert.equal(res.body.secret_disclosure, false);
    assert.equal(res.body.owner_database_url_fallback_used, false);
    assert.equal(res.body.no_rows_exported, true);
    assertNoSensitiveLeak(JSON.stringify(res.body));
  });

  it('returns JSON PASS 200 from executeDbReadonlyProof result', async () => {
    const res = createMockRes();
    const req = { headers: { authorization: 'Bearer test' } };
    await handleSlimDbReadonlyProofAuthenticatedGet(req, res, {
      executeProof: async () => ({
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
      }),
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.verdict, 'PASS');
    assertNoSensitiveLeak(JSON.stringify(res.body));
  });

  it('returns sanitized JSON 503 when executeProof throws', async () => {
    const res = createMockRes();
    const req = { headers: { authorization: 'Bearer test' } };
    await handleSlimDbReadonlyProofAuthenticatedGet(req, res, {
      executeProof: async () => {
        throw new Error('synthetic_failure_postgresql://must-not-leak');
      },
    });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.classification, 'SLIM_DB_READONLY_PROOF_RUNTIME_EXCEPTION');
    assert.equal(res.body.verdict, 'BLOCKED');
    assert.equal(res.body.secret_disclosure, false);
    assert.equal(res.body.write_probe_occurred, false);
    assert.equal(res.body.row_export_occurred, false);
    assertNoSensitiveLeak(JSON.stringify(res.body));
  });

  it('response keys stay within allowed contract on PASS', async () => {
    const res = createMockRes();
    await handleSlimDbReadonlyProofAuthenticatedGet({ headers: {} }, res, {
      executeProof: async () => ({
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
      }),
    });
    for (const key of Object.keys(res.body)) {
      assert.ok(
        DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS.includes(key) ||
          key === 'ok' ||
          key === 'success' ||
          key === 'classification' ||
          key === 'reason' ||
          key === 'route' ||
          key === 'auth_required' ||
          key === 'slim_authenticated_proof',
        `unexpected key on slim handler PASS path: ${key}`,
      );
    }
  });
});
