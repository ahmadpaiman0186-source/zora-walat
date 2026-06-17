/**
 * L-85K guarded read-only DB proof endpoint — unit, HTTP, and static boundary tests.
 * No live Neon, no .env.local, no network DB.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS,
  DB_READONLY_PROOF_SCOPED_TABLES,
  dbReadonlyProofInvariants,
} from '../src/lib/dbReadonlyProofContract.js';
import {
  executeDbReadonlyProof,
  finalizeReadonlyProofVerdict,
  resolveReadonlyDatabaseUrl,
} from '../src/services/dbReadonlyProofService.js';
import {
  SENSITIVE_LEAK_MARKERS,
  SENSITIVE_LEAK_MATERIAL,
} from './fixtures/shadowSafetyGate/sensitiveLeakFixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_SRC = join(__dirname, '../src/services/dbReadonlyProofService.js');
const ROUTE_SRC = join(__dirname, '../src/routes/ops.routes.js');

const OPS_TOKEN = 'ops-token-test-16chars-min';

const authDeps = {
  isOpsHealthTokenConfigured: () => true,
};

function fakeReq(headers = {}) {
  return /** @type {import('express').Request} */ ({ headers });
}

function passProbeFlags() {
  return {
    readonly_role_expected: true,
    database_expected: true,
    role_superuser_false: true,
    role_createdb_false: true,
    role_createrole_false: true,
    scoped_tables_checked_count: DB_READONLY_PROOF_SCOPED_TABLES.length,
    select_allowed_all_scoped_tables: true,
    write_denied_all_scoped_tables: true,
  };
}

function assertSafeResponseBody(body) {
  assert.equal(typeof body, 'object');
  assert.notEqual(body, null);

  const invariants = dbReadonlyProofInvariants();
  for (const [key, value] of Object.entries(invariants)) {
    assert.equal(body[key], value, `invariant ${key}`);
  }

  assert.ok(['PASS', 'BLOCKED', 'FAIL'].includes(body.verdict));
  assert.equal(typeof body.checked_at, 'string');

  for (const key of Object.keys(body)) {
    assert.ok(
      DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS.includes(key),
      `unexpected response key: ${key}`,
    );
  }

  assert.equal(body.rows, undefined);
  assert.equal(body.data, undefined);
  assert.equal(Array.isArray(body.tables), false);
}

function assertNoSensitiveLeak(json) {
  assert.ok(!json.includes(SENSITIVE_LEAK_MATERIAL.whsec), 'must not leak whsec');
  assert.ok(!json.includes(SENSITIVE_LEAK_MARKERS.skLivePrefix), 'must not leak sk_live');
  assert.ok(!json.includes('postgresql://'), 'must not leak connection URL scheme');
  assert.ok(!json.includes('neon.tech'), 'must not leak host marker');
}

describe('L-85K executeDbReadonlyProof auth gates', () => {
  it('missing token fails closed with BLOCKED token_missing', async () => {
    const result = await executeDbReadonlyProof(fakeReq(), {
      ...authDeps,
      tokenMatches: () => true,
      getReadonlyUrl: () => 'postgresql://readonly-proof-test',
    });

    assert.equal(result.httpStatus, 401);
    assert.equal(result.body.verdict, 'BLOCKED');
    assert.equal(result.body.blocked_reason, 'token_missing');
    assertSafeResponseBody(result.body);
  });

  it('invalid token fails closed with BLOCKED token_invalid', async () => {
    const result = await executeDbReadonlyProof(
      fakeReq({ authorization: 'Bearer wrong-token-value-here' }),
      {
        ...authDeps,
        tokenMatches: () => false,
        getReadonlyUrl: () => 'postgresql://readonly-proof-test',
      },
    );

    assert.equal(result.httpStatus, 401);
    assert.equal(result.body.verdict, 'BLOCKED');
    assert.equal(result.body.blocked_reason, 'token_invalid');
    assertSafeResponseBody(result.body);
  });

  it('missing READ_ONLY_DATABASE_URL returns BLOCKED readonly_url_missing', async () => {
    let probeCalled = false;
    const result = await executeDbReadonlyProof(
      fakeReq({ 'x-zw-ops-token': OPS_TOKEN }),
      {
        ...authDeps,
        tokenMatches: () => true,
        getReadonlyUrl: () => '',
        runProbe: async () => {
          probeCalled = true;
          return passProbeFlags();
        },
      },
    );

    assert.equal(probeCalled, false);
    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.verdict, 'BLOCKED');
    assert.equal(result.body.blocked_reason, 'readonly_url_missing');
    assert.equal(result.body.owner_database_url_fallback_used, false);
    assertSafeResponseBody(result.body);
  });

  it('valid token + readonly URL uses probe only (no owner fallback)', async () => {
    let probeUrl = '';
    const result = await executeDbReadonlyProof(
      fakeReq({ authorization: `Bearer ${OPS_TOKEN}` }),
      {
        ...authDeps,
        tokenMatches: () => true,
        getReadonlyUrl: () => 'postgresql://readonly-only-connection',
        runProbe: async (url) => {
          probeUrl = url;
          return passProbeFlags();
        },
      },
    );

    assert.equal(probeUrl, 'postgresql://readonly-only-connection');
    assert.equal(result.httpStatus, 200);
    assert.equal(result.body.verdict, 'PASS');
    assertSafeResponseBody(result.body);
    assertNoSensitiveLeak(JSON.stringify(result.body));
  });
});

describe('L-85K resolveReadonlyDatabaseUrl isolation', () => {
  it('reads only injected readonly URL getter — not DATABASE_URL', () => {
    const prevDb = process.env.DATABASE_URL;
    const prevRo = process.env.READ_ONLY_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://owner-should-not-be-used';
    process.env.READ_ONLY_DATABASE_URL = 'postgresql://readonly-should-not-be-read-from-env';

    try {
      assert.equal(
        resolveReadonlyDatabaseUrl(() => 'postgresql://injected-readonly'),
        'postgresql://injected-readonly',
      );
    } finally {
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
      if (prevRo === undefined) delete process.env.READ_ONLY_DATABASE_URL;
      else process.env.READ_ONLY_DATABASE_URL = prevRo;
    }
  });
});

describe('L-85K finalizeReadonlyProofVerdict', () => {
  it('returns PASS when all flags true', () => {
    const result = finalizeReadonlyProofVerdict(passProbeFlags());
    assert.equal(result.body.verdict, 'PASS');
    assertSafeResponseBody(result.body);
  });

  it('returns FAIL when write privileges present', () => {
    const result = finalizeReadonlyProofVerdict({
      ...passProbeFlags(),
      write_denied_all_scoped_tables: false,
    });
    assert.equal(result.body.verdict, 'FAIL');
    assert.equal(result.body.fail_reason, 'write_privilege_present');
    assertSafeResponseBody(result.body);
  });
});

describe('L-85K import boundary static review', () => {
  it('service avoids owner db.js import and DATABASE_URL connection fallback', () => {
    const src = readFileSync(SERVICE_SRC, 'utf8');
    assert.ok(!/\bfrom ['"].*\/db\.js['"]/.test(src));
    assert.ok(!/process\.env\.DATABASE_URL/.test(src));
    assert.match(src, /READ_ONLY_DATABASE_URL/);
    assert.match(src, /createReadonlyProofPrismaClient/);
  });

  it('route wires executeDbReadonlyProof for db-readonly-proof path', () => {
    const src = readFileSync(ROUTE_SRC, 'utf8');
    assert.match(src, /router\.get\('\/db-readonly-proof'/);
    assert.match(
      src,
      /router\.get\('\/db-readonly-proof'[\s\S]*?executeDbReadonlyProof[\s\S]*?result\.httpStatus/,
    );
  });
});

describe('L-85K route HTTP (child process with env before app load)', () => {
  it('runs route boundary checks in isolated child', async () => {
    const { spawnSync } = await import('node:child_process');
    const { join } = await import('node:path');
    const childPath = join(__dirname, 'helpers/dbReadonlyProofRouteChild.test.js');
    const result = spawnSync(process.execPath, ['--test', childPath], {
      cwd: join(__dirname, '..'),
      env: {
        ...process.env,
        OPS_HEALTH_TOKEN: OPS_TOKEN,
        READ_ONLY_DATABASE_URL: '',
        NODE_ENV: 'test',
      },
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      assert.fail(
        `child route tests failed (status ${result.status}):\n${result.stdout}\n${result.stderr}`,
      );
    }
  });
});
