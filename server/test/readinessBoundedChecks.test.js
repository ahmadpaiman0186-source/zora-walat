/**
 * Bounded readiness probes: never hang on stuck Postgres promises (serverless-safe).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  raceReadinessOperation,
  runReadinessDatabaseCore,
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
