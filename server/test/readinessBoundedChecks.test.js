/**
 * Bounded readiness probes: never hang on stuck Postgres promises (serverless-safe).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifySlimReadyDbProbeFailure,
  raceReadinessOperation,
  runReadinessDatabaseCore,
  SLIM_READY_DB_ERROR_NAME_MAX_LEN,
} from '../src/lib/readinessBoundedChecks.js';

describe('raceReadinessOperation', () => {
  it('resolves when the underlying promise wins', async () => {
    const v = await raceReadinessOperation(Promise.resolve(7), 10_000, 't');
    assert.equal(v, 7);
  });

  it('rejects with the given code when the promise never settles', async () => {
    const hanging = new Promise(() => {});
    await assert.rejects(
      async () => raceReadinessOperation(hanging, 40, 'never_settles'),
      (err) =>
        err instanceof Error &&
        err.code === 'never_settles' &&
        err.message === 'never_settles',
    );
  });
});

describe('classifySlimReadyDbProbeFailure', () => {
  it('maps P1000 to prisma_auth', () => {
    const e = new Error('');
    e.name = 'PrismaClientKnownRequestError';
    e.code = 'P1000';
    const r = classifySlimReadyDbProbeFailure(e);
    assert.equal(r.prismaCode, 'P1000');
    assert.equal(r.safeCategory, 'prisma_auth');
    assert.equal(r.errorName, 'PrismaClientKnownRequestError');
  });

  it('uses unknown errorName when name exceeds max length', () => {
    const e = new Error('');
    e.name = 'x'.repeat(SLIM_READY_DB_ERROR_NAME_MAX_LEN + 1);
    e.code = 'P1000';
    const r = classifySlimReadyDbProbeFailure(e);
    assert.equal(r.errorName, 'unknown');
    assert.equal(r.prismaCode, 'P1000');
    assert.equal(r.safeCategory, 'prisma_auth');
  });

  it('maps Prisma-named errors without P-code to prisma_unknown', () => {
    const e = new Error('');
    e.name = 'PrismaClientRustPanicError';
    e.code = '0';
    const r = classifySlimReadyDbProbeFailure(e);
    assert.equal(r.prismaCode, '');
    assert.equal(r.safeCategory, 'prisma_unknown');
  });
});

describe('runReadinessDatabaseCore slim diagnostics', () => {
  it('logs P1000 with prisma_auth on select_1 when logSlimReadyDbError', async () => {
    const lines = [];
    const orig = console.warn;
    console.warn = (...args) => {
      lines.push(args);
    };
    try {
      const err = new Error('');
      err.name = 'PrismaClientKnownRequestError';
      err.code = 'P1000';
      const prisma = {
        $queryRaw: () => Promise.reject(err),
        webTopupOrder: { findFirst: async () => null },
      };
      await runReadinessDatabaseCore(prisma, {
        dbProbeMs: 50,
        logSlimReadyDbError: true,
      });
    } finally {
      console.warn = orig;
    }
    assert.equal(lines.length, 1);
    assert.equal(lines[0][0], '[slim-ready-db-error]');
    assert.deepEqual(lines[0][1], {
      probeStep: 'select_1',
      errorName: 'PrismaClientKnownRequestError',
      prismaCode: 'P1000',
      safeCategory: 'prisma_auth',
    });
  });

  it('does not log message, stack, or URL-like substrings on unknown errors', async () => {
    const lines = [];
    const orig = console.warn;
    console.warn = (...args) => {
      lines.push(args);
    };
    try {
      const err = new Error(
        'postgres://user:pass@host:5432/db?sslmode=require',
      );
      err.name = 'DriverError';
      err.code = '28P01';
      err.stack = 'stack line postgres://leak';
      const prisma = {
        $queryRaw: () => Promise.reject(err),
        webTopupOrder: { findFirst: async () => null },
      };
      await runReadinessDatabaseCore(prisma, {
        dbProbeMs: 50,
        logSlimReadyDbError: true,
      });
    } finally {
      console.warn = orig;
    }
    assert.equal(lines.length, 1);
    const payload = lines[0][1];
    const serialized = JSON.stringify(payload);
    assert.ok(!serialized.includes('postgres'));
    assert.ok(!serialized.includes('user:pass'));
    assert.ok(!serialized.includes('stack'));
    assert.ok(!serialized.includes('28P01'));
    assert.deepEqual(Object.keys(payload).sort(), [
      'errorName',
      'prismaCode',
      'probeStep',
      'safeCategory',
    ]);
    assert.equal(payload.probeStep, 'select_1');
    assert.equal(payload.prismaCode, '');
    assert.equal(payload.safeCategory, 'unknown_db_error');
  });

  it('does not log on db_timeout when logSlimReadyDbError is true', async () => {
    const lines = [];
    const orig = console.warn;
    console.warn = (...args) => {
      lines.push(args);
    };
    try {
      const prisma = {
        $queryRaw: () => new Promise(() => {}),
        webTopupOrder: { findFirst: async () => null },
      };
      await runReadinessDatabaseCore(prisma, {
        dbProbeMs: 35,
        logSlimReadyDbError: true,
      });
    } finally {
      console.warn = orig;
    }
    assert.equal(lines.length, 0);
  });
});

describe('runReadinessDatabaseCore', () => {
  it('returns db_timeout when SELECT 1 hangs', async () => {
    const prisma = {
      $queryRaw: () => new Promise(() => {}),
      webTopupOrder: { findFirst: async () => null },
    };
    const r = await runReadinessDatabaseCore(prisma, { dbProbeMs: 35 });
    assert.equal(r.ok, false);
    assert.equal(r.readinessReason, 'db_timeout');
    assert.equal(r.checks.database, 'db_timeout');
  });

  it('returns db_error when SELECT 1 rejects', async () => {
    const prisma = {
      $queryRaw: () => Promise.reject(new Error('econn')),
      webTopupOrder: { findFirst: async () => null },
    };
    const r = await runReadinessDatabaseCore(prisma, { dbProbeMs: 2000 });
    assert.equal(r.ok, false);
    assert.equal(r.readinessReason, 'db_error');
    assert.equal(r.checks.database, 'failed');
  });

  it('returns db_timeout when findFirst hangs after SELECT 1 succeeds', async () => {
    const prisma = {
      $queryRaw: function () {
        return Promise.resolve([]);
      },
      webTopupOrder: { findFirst: () => new Promise(() => {}) },
    };
    const r = await runReadinessDatabaseCore(prisma, { dbProbeMs: 40 });
    assert.equal(r.ok, false);
    assert.equal(r.readinessReason, 'db_timeout');
    assert.equal(r.checks.database, 'ok');
    assert.equal(r.checks.webTopupPersistence, 'db_timeout');
  });

  it('returns ok when both probes resolve', async () => {
    const prisma = {
      $queryRaw: function () {
        return Promise.resolve([]);
      },
      webTopupOrder: { findFirst: async () => ({ id: 'x' }) },
    };
    const r = await runReadinessDatabaseCore(prisma, { dbProbeMs: 500 });
    assert.equal(r.ok, true);
    assert.equal(r.checks.database, 'ok');
    assert.equal(r.checks.webTopupPersistence, 'ok');
  });
});

describe('raceReadinessOperation (queue-shaped)', () => {
  it('rejects queue_timeout when queue promise hangs', async () => {
    const hanging = new Promise(() => {});
    await assert.rejects(
      async () => raceReadinessOperation(hanging, 35, 'queue_timeout'),
      (err) => err.code === 'queue_timeout',
    );
  });
});
