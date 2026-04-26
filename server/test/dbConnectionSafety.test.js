import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prisma } from '../src/db.js';
import { getWebtopResourceSnapshot } from '../src/lib/webtopResourceSnapshot.js';

const hasDb = Boolean(String(process.env.DATABASE_URL ?? '').trim());

describe('database connection safety (Phase 13)', () => {
  it('uses a single PrismaClient instance (import only from src/db.js)', () => {
    assert.equal(globalThis.__ZW_PRISMA_CLIENT__, prisma);
  });

  it(
    'getWebtopResourceSnapshot returns bounded process + optional pg_stat_activity counts',
    { skip: !hasDb },
    async () => {
      const snap = await getWebtopResourceSnapshot(null);
      assert.equal(snap.schemaVersion, 1);
      assert.ok(snap.collectedAt);
      assert.ok(snap.process?.memoryUsage);
      assert.ok(typeof snap.process.memoryUsage.heapUsed === 'number');
      if (snap.database && !snap.database.unavailable) {
        assert.ok(typeof snap.database.connectionsTotal === 'number');
        assert.ok(snap.database.connectionsTotal >= 1);
      }
      assert.ok(snap.workerActivity);
    },
  );
});
