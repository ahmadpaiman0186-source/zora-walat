/**
 * DB-primary wallet top-up idempotency (`WalletTopupIdempotency`). Requires migrated PostgreSQL.
 * Use `TEST_DATABASE_URL` (CI) or rely on `preloadTestDatabaseUrl` copying it to `DATABASE_URL`.
 *
 * `preloadTestDatabaseUrl.mjs`: if `TEST_DATABASE_URL` is set, it **replaces** `DATABASE_URL` for tests — that DB must be fully migrated too.
 * Migrate the effective URL: `cd server && npm run db:migrate:integration` (uses TEST_DATABASE_URL when set, else DATABASE_URL from .env).
 * Or `npm run db:migrate` if you intentionally use only DATABASE_URL from .env (no TEST_DATABASE_URL).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import { computeMainBalanceUsdCentsFromLedger } from '../../src/lib/walletLedgerBalance.js';
import { USER_WALLET_LEDGER_REASON_REFERRAL_INVITER_PROMOTIONAL } from '../../src/constants/walletLedgerReasons.js';
import * as userWalletService from '../../src/services/wallet/userWalletService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for wallet idempotency integration tests');
}

/** After preload, `DATABASE_URL` is always the effective integration URL. */
const dbUrl = process.env.DATABASE_URL;
const runIntegration = Boolean(dbUrl);

describe('Wallet top-up idempotency (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {string[]} */
  const userIds = [];

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
    try {
      await prisma.$queryRaw`SELECT 1 FROM "UserWalletLedgerEntry" LIMIT 1`;
    } catch (e) {
      const src = process.env.ZW_INTEGRATION_TEST_DB_SOURCE ?? '?';
      const disp = process.env.ZW_INTEGRATION_TEST_DB_DISPLAY ?? '?';
      const hint =
        src === 'TEST_DATABASE_URL'
          ? `Integration tests use TEST_DATABASE_URL (effective: ${disp}). That database is missing expected tables — run: cd server && npm run db:migrate:integration. Or unset TEST_DATABASE_URL to use DATABASE_URL from .env only.`
          : `Apply migrations to DATABASE_URL (${disp}): cd server && npm run db:migrate (or npm run db:migrate:integration — same URL when TEST_DATABASE_URL is unset).`;
      throw new Error(`${hint}\nUnderlying: ${String(e?.message ?? e)}`);
    }
  });

  after(async () => {
    if (prisma) await prisma.$disconnect();
  });

  afterEach(async () => {
    if (!prisma) return;
    for (const uid of userIds) {
      await prisma.user.deleteMany({ where: { id: uid } });
    }
    userIds.length = 0;
  });

  async function makeUser() {
    const u = await prisma.user.create({
      data: {
        email: `wt_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });
    userIds.push(u.id);
    return u;
  }

  it('first apply credits wallet; replay with same key+amount is idempotent (no double credit)', async () => {
    const u = await makeUser();
    const key = randomUUID();
    const r1 = await userWalletService.topupIdempotent(u.id, 3, key);
    assert.equal(r1.idempotentReplay, false);
    const balAfterFirst = r1.state.balance;

    const r2 = await userWalletService.topupIdempotent(u.id, 3, key);
    assert.equal(r2.idempotentReplay, true);
    assert.equal(r2.state.balance, balAfterFirst);
  });

  it('same key with different amount is rejected (conflict code)', async () => {
    const u = await makeUser();
    const key = randomUUID();
    await userWalletService.topupIdempotent(u.id, 2, key);
    await assert.rejects(
      () => userWalletService.topupIdempotent(u.id, 5, key),
      (e) => e && typeof e === 'object' && e.code === 'wallet_idempotency_conflict',
    );
  });

  it('idempotent apply writes one ledger row; replay does not add another', async () => {
    const u = await makeUser();
    const key = randomUUID();
    await userWalletService.topupIdempotent(u.id, 2.5, key);
    const n1 = await prisma.userWalletLedgerEntry.count({
      where: { userId: u.id },
    });
    assert.equal(n1, 1);
    const row = await prisma.userWalletLedgerEntry.findFirst({
      where: { userId: u.id },
    });
    assert.equal(row?.reason, 'wallet_topup');
    assert.equal(row?.idempotencyKey, key);
    assert.equal(row?.amountUsdCents, 250);
    assert.equal(row?.direction, 'CREDIT');
    assert.ok(
      typeof row?.balanceAfterUsdCents === 'number' &&
        row.balanceAfterUsdCents > 0,
    );

    await userWalletService.topupIdempotent(u.id, 2.5, key);
    const n2 = await prisma.userWalletLedgerEntry.count({
      where: { userId: u.id },
    });
    assert.equal(n2, 1);
  });

  it('legacy topup appends a ledger row (idempotency key null)', async () => {
    const u = await makeUser();
    await userWalletService.topup(u.id, 1);
    const rows = await prisma.userWalletLedgerEntry.findMany({
      where: { userId: u.id },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.reason, 'wallet_topup_legacy');
    assert.equal(rows[0]?.idempotencyKey, null);
    assert.equal(rows[0]?.amountUsdCents, 100);
  });

  it('ledger rows carry referenceId and metadataJson; balance matches ledger sum', async () => {
    const u = await makeUser();
    const key = randomUUID();
    await userWalletService.topupIdempotent(u.id, 4, key);
    const row = await prisma.userWalletLedgerEntry.findFirst({
      where: { userId: u.id },
    });
    assert.ok(row?.referenceId && row.referenceId.length > 8);
    assert.ok(row?.metadataJson?.includes('idempotent'));
    const w = await prisma.userWallet.findUnique({ where: { userId: u.id } });
    const computed = await computeMainBalanceUsdCentsFromLedger(prisma, u.id);
    assert.equal(w?.balanceUsdCents, computed);
  });

  it('main-balance ledger sum ignores promotional / non-main ledger reasons', async () => {
    const u = await makeUser();
    await userWalletService.topupIdempotent(u.id, 1, randomUUID());
    const w1 = await prisma.userWallet.findUnique({ where: { userId: u.id } });
    const c1 = await computeMainBalanceUsdCentsFromLedger(prisma, u.id);
    assert.equal(w1?.balanceUsdCents, c1);

    await prisma.userWalletLedgerEntry.create({
      data: {
        referenceId: randomUUID(),
        userId: u.id,
        direction: 'CREDIT',
        reason: USER_WALLET_LEDGER_REASON_REFERRAL_INVITER_PROMOTIONAL,
        amountUsdCents: 99_000,
        currency: 'USD',
        balanceAfterUsdCents: w1?.balanceUsdCents ?? 10_100,
        idempotencyKey: `test-promo:${randomUUID()}`,
        metadataJson: JSON.stringify({ bucket: 'promotional', test: true }),
      },
    });
    const w2 = await prisma.userWallet.findUnique({ where: { userId: u.id } });
    const c2 = await computeMainBalanceUsdCentsFromLedger(prisma, u.id);
    assert.equal(c1, c2);
    assert.equal(w2?.balanceUsdCents, c2);
  });

  it('database rejects UPDATE on UserWalletLedgerEntry (immutable ledger)', async () => {
    const u = await makeUser();
    await userWalletService.topupIdempotent(u.id, 1, randomUUID());
    const row = await prisma.userWalletLedgerEntry.findFirst({
      where: { userId: u.id },
    });
    assert.ok(row);
    await assert.rejects(async () => {
      await prisma.userWalletLedgerEntry.update({
        where: { id: row.id },
        data: { amountUsdCents: 999999 },
      });
    });
  });

  it('rejects amount above WALLET_TOPUP_MAX_USD_CENTS', async () => {
    const prev = process.env.WALLET_TOPUP_MAX_USD_CENTS;
    process.env.WALLET_TOPUP_MAX_USD_CENTS = '100';
    const u = await makeUser();
    const key = randomUUID();
    try {
      await assert.rejects(
        () => userWalletService.topupIdempotent(u.id, 2, key),
        (e) =>
          e &&
          typeof e === 'object' &&
          e.code === 'wallet_topup_amount_out_of_range',
      );
    } finally {
      if (prev === undefined) delete process.env.WALLET_TOPUP_MAX_USD_CENTS;
      else process.env.WALLET_TOPUP_MAX_USD_CENTS = prev;
    }
  });
});
