/**
 * Invoked from `run-unit-tests.mjs` before the suite. When `DATABASE_URL` is non-empty,
 * verifies the DB accepts a trivial query within a bounded time so invalid credentials
 * fail fast (no secret values logged).
 */
import '../test/setupTestEnv.mjs';

const skip = String(process.env.ZW_SKIP_DB_UNIT_PRECHECK ?? '').trim() === 'true';
if (skip) {
  process.exit(0);
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
if (!dbUrl) {
  process.exit(0);
}

const parsed = parseInt(String(process.env.ZW_UNIT_DB_PRECHECK_MS ?? '4000').trim(), 10);
const MS = Math.min(5000, Math.max(2000, Number.isFinite(parsed) ? parsed : 4000));

const { prisma } = await import('../src/db.js');

try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => {
      setTimeout(() => {
        const e = new Error('db_unit_precheck_timeout');
        e.code = 'db_unit_precheck_timeout';
        rej(e);
      }, MS);
    }),
  ]);
  process.exit(0);
} catch (e) {
  const name = String(e?.name ?? 'Error');
  const sub = e?.code != null ? String(e.code) : '';
  console.error(
    `[fatal] code=db_unit_precheck phase=unit_test_env error_name=${name}${sub ? ` subcode=${sub}` : ''}`,
  );
  console.error(
    '[fatal] DATABASE_URL is set but not usable for tests — fix credentials or set ZW_SKIP_DB_UNIT_PRECHECK=true',
  );
  process.exit(1);
}
