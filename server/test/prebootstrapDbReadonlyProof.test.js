/**
 * L-85P pre-bootstrap read-only proof route guard tests.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  buildPrebootstrapDbReadonlyProofBlockedBody,
  evaluatePrebootstrapDbReadonlyProof,
} from '../lib/prebootstrapDbReadonlyProofGuard.mjs';
import { handleSlimDbReadonlyProofPrebootstrapGet } from '../handlers/slimDbReadonlyProofPrebootstrapHandler.mjs';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD_SRC = join(__dirname, '../lib/prebootstrapDbReadonlyProofGuard.mjs');
const HANDLER_SRC = join(__dirname, '../handlers/slimDbReadonlyProofPrebootstrapHandler.mjs');
const INDEX_SRC = join(__dirname, '../api/index.mjs');

const OPS_TOKEN = 'ops-token-test-16chars-min';
const ROUTE = '/ops/db-readonly-proof';

function fakeReq(headers = {}) {
  return { headers, url: ROUTE };
}

function mockRes() {
  const out = { statusCode: 0, body: null, headers: {} };
  return {
    out,
    res: {
      setHeader(k, v) {
        out.headers[k] = v;
      },
      status(code) {
        out.statusCode = code;
        return {
          json(body) {
            out.body = body;
          },
        };
      },
    },
  };
}

function assertNoSensitiveLeak(json) {
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.whsec));
  assert.ok(!json.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix));
  assert.ok(!json.includes('postgresql://'));
}

const REQUIRED_BLOCKED_FIELDS = [
  'ok',
  'verdict',
  'reason',
  'route',
  'auth_required',
  'prebootstrap_guard',
  'db_query_performed',
  'row_export_occurred',
  'write_probe_occurred',
  'secret_disclosure',
  'owner_database_url_fallback_used',
  'runtime_db_identity_proof',
  'readonly_database_url_proof',
];

describe('L-85P prebootstrap guard evaluate', () => {
  it('missing token returns token_missing', () => {
    const d = evaluatePrebootstrapDbReadonlyProof(fakeReq(), ROUTE, {
      readConfiguredOpsToken: () => OPS_TOKEN,
    });
    assert.deepEqual(d, { action: 'blocked', reason: 'token_missing' });
  });

  it('invalid token returns token_invalid', () => {
    const d = evaluatePrebootstrapDbReadonlyProof(
      fakeReq({ authorization: 'Bearer wrong-token-value-here' }),
      ROUTE,
      { readConfiguredOpsToken: () => OPS_TOKEN },
    );
    assert.deepEqual(d, { action: 'blocked', reason: 'token_invalid' });
  });

  it('unconfigured OPS token returns token_invalid', () => {
    const d = evaluatePrebootstrapDbReadonlyProof(
      fakeReq({ 'x-zw-ops-token': OPS_TOKEN }),
      ROUTE,
      { readConfiguredOpsToken: () => '' },
    );
    assert.deepEqual(d, { action: 'blocked', reason: 'token_invalid' });
  });

  it('valid token without READ_ONLY_DATABASE_URL returns readonly_url_missing', () => {
    const d = evaluatePrebootstrapDbReadonlyProof(
      fakeReq({ authorization: `Bearer ${OPS_TOKEN}` }),
      ROUTE,
      {
        readConfiguredOpsToken: () => OPS_TOKEN,
        hasReadonlyDatabaseUrl: () => false,
      },
    );
    assert.deepEqual(d, { action: 'blocked', reason: 'readonly_url_missing' });
  });

  it('valid token with readonly URL configured returns pass_through', () => {
    const d = evaluatePrebootstrapDbReadonlyProof(
      fakeReq({ authorization: `Bearer ${OPS_TOKEN}` }),
      ROUTE,
      {
        readConfiguredOpsToken: () => OPS_TOKEN,
        hasReadonlyDatabaseUrl: () => true,
      },
    );
    assert.deepEqual(d, { action: 'pass_through' });
  });
});

describe('L-85P prebootstrap handler responses', () => {
  it('missing token returns fast 401 BLOCKED JSON', async () => {
    const { res, out } = mockRes();
    let passCalled = false;
    await handleSlimDbReadonlyProofPrebootstrapGet(fakeReq(), res, {
      route: ROUTE,
      deps: { readConfiguredOpsToken: () => OPS_TOKEN },
      passThrough: async () => {
        passCalled = true;
      },
    });
    assert.equal(passCalled, false);
    assert.equal(out.statusCode, 401);
    assert.equal(out.body.verdict, 'BLOCKED');
    assert.equal(out.body.reason, 'token_missing');
    assert.equal(out.body.prebootstrap_guard, true);
    assert.equal(out.body.db_query_performed, false);
    for (const f of REQUIRED_BLOCKED_FIELDS) {
      assert.ok(f in out.body, `missing field ${f}`);
    }
    assertNoSensitiveLeak(JSON.stringify(out.body));
  });

  it('invalid token returns fast 401 BLOCKED JSON', async () => {
    const { res, out } = mockRes();
    await handleSlimDbReadonlyProofPrebootstrapGet(
      fakeReq({ authorization: 'Bearer not-the-right-token-value' }),
      res,
      {
        route: ROUTE,
        deps: { readConfiguredOpsToken: () => OPS_TOKEN },
        passThrough: async () => {
          throw new Error('pass_through_must_not_run');
        },
      },
    );
    assert.equal(out.statusCode, 401);
    assert.equal(out.body.reason, 'token_invalid');
    assertNoSensitiveLeak(JSON.stringify(out.body));
  });
});

describe('L-85P import boundary static review', () => {
  it('guard avoids db proof service, prisma, owner db.js, owner DATABASE_URL', () => {
    const src = readFileSync(GUARD_SRC, 'utf8');
    assert.ok(!/dbReadonlyProofService/.test(src));
    assert.ok(!/\bprisma\b/i.test(src));
    assert.ok(!/\/db\.js/.test(src));
    assert.ok(!/process\.env\.DATABASE_URL/.test(src));
    assert.match(src, /READ_ONLY_DATABASE_URL/);
    assert.match(src, /timingSafeEqualUtf8/);
  });

  it('handler avoids db proof service and prisma imports', () => {
    const src = readFileSync(HANDLER_SRC, 'utf8');
    assert.ok(!/dbReadonlyProofService/.test(src));
    assert.ok(!/\bprisma\b/i.test(src));
    assert.match(src, /prebootstrapDbReadonlyProofGuard/);
  });

  it('index wires prebootstrap handler before stripe webhook block', () => {
    const src = readFileSync(INDEX_SRC, 'utf8');
    assert.match(src, /slimDbReadonlyProofPrebootstrapHandler/);
    assert.match(src, /\/ops\/db-readonly-proof/);
    const preIdx = src.indexOf('slimDbReadonlyProofPrebootstrapHandler');
    const stripeIdx = src.indexOf('slimStripeWebhookHandler');
    assert.ok(preIdx > 0 && stripeIdx > preIdx);
  });

  it('index proof pass-through uses slim authenticated handler (L-86B)', () => {
    const src = readFileSync(INDEX_SRC, 'utf8');
    const start = src.indexOf('slimDbReadonlyProofPrebootstrapHandler');
    const end = src.indexOf('slimStripeWebhookHandler', start);
    const block = src.slice(start, end);
    assert.match(block, /slimDbReadonlyProofAuthenticatedHandler/);
    assert.ok(!/getHandler\(\)/.test(block), 'proof block must not call getHandler()');
  });
});

describe('L-85P blocked body contract', () => {
  it('includes required safe fields with false invariants', () => {
    const body = buildPrebootstrapDbReadonlyProofBlockedBody(ROUTE, 'token_missing');
    assert.equal(body.ok, false);
    assert.equal(body.secret_disclosure, false);
    assert.equal(body.owner_database_url_fallback_used, false);
    assert.equal(body.row_export_occurred, false);
    assert.equal(body.write_probe_occurred, false);
    assert.equal(body.runtime_db_identity_proof, false);
    assert.equal(body.readonly_database_url_proof, false);
  });
});

describe('L-85P prebootstrap child (no db proof service import)', () => {
  it('runs isolated child proving passThrough not invoked without token', async () => {
    const { spawnSync } = await import('node:child_process');
    const childPath = join(
      __dirname,
      'helpers/prebootstrapDbReadonlyProofChild.test.js',
    );
    const result = spawnSync(process.execPath, ['--test', childPath], {
      cwd: join(__dirname, '..'),
      env: { ...process.env, OPS_HEALTH_TOKEN: OPS_TOKEN, NODE_ENV: 'test' },
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      assert.fail(
        `child failed (status ${result.status}):\n${result.stdout}\n${result.stderr}`,
      );
    }
  });
});
