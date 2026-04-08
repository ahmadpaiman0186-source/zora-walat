import { randomUUID } from 'node:crypto';

import { prisma, Prisma } from '../../db.js';
import { env } from '../../config/env.js';
import { DEFAULT_WALLET_USD_CENTS } from '../../constants/walletConstants.js';
import {
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP,
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP_LEGACY,
} from '../../constants/walletLedgerReasons.js';
import { verifyWalletLedgerBalanceConsistency } from '../../lib/walletLedgerBalance.js';
import { logWalletTopupEvent } from '../../lib/walletTopupStructuredLog.js';
import { recordMoneyPathOpsSignal } from '../../lib/opsMetrics.js';

/** Set `DEBUG_WALLET_TOPUP=true` for verbose stdout. */
const debugTopup =
  typeof process !== 'undefined' &&
  process.env.DEBUG_WALLET_TOPUP === 'true';

function assertTopupAmountCentsWithinPolicy(addCents) {
  if (addCents > env.walletTopupMaxUsdCents) {
    const err = new Error('Amount exceeds maximum allowed');
    err.code = 'wallet_topup_amount_out_of_range';
    throw err;
  }
}

function topupMetadataJson(channel) {
  return JSON.stringify({ v: 1, channel });
}

/**
 * @param {string} userId
 * @param {'apply' | 'legacy'} kind
 */
async function assertLedgerMatchesWalletAfterTopup(userId, kind) {
  const check = await verifyWalletLedgerBalanceConsistency(prisma, userId);
  if (check.ok) return;
  recordMoneyPathOpsSignal('wallet_ledger_balance_mismatch');
  logWalletTopupEvent({
    result: 'ledger_balance_mismatch',
    invariantScope: check.scope ?? 'main_balance_ledger',
    userIdSuffix: userId.slice(-8),
    kind,
    storedUsdCents: check.stored,
    computedUsdCents: check.computed,
  });
  if (env.walletStrictLedgerVerify) {
    const err = new Error('Wallet balance does not match ledger sum');
    err.code = 'wallet_ledger_invariant_violation';
    throw err;
  }
}

/**
 * Per-user wallet in PostgreSQL — safe for multiple app instances (no in-memory Map).
 */
export async function getWalletState(userId) {
  const row = await prisma.userWallet.upsert({
    where: { userId },
    create: {
      userId,
      balanceUsdCents: DEFAULT_WALLET_USD_CENTS,
      currency: 'USD',
    },
    update: {},
  });
  return {
    balance: row.balanceUsdCents / 100,
    currency: row.currency,
  };
}

/**
 * Legacy path (no client idempotency) — single-flight increment only; retried POSTs can double-credit.
 * Prefer {@link topupIdempotent}.
 */
export async function topup(userId, amountUsd) {
  const n = Number(amountUsd);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be a positive number');
  }
  const addCents = Math.round(n * 100);
  assertTopupAmountCentsWithinPolicy(addCents);
  const referenceId = randomUUID();

  if (debugTopup) console.log('TOPUP START', { userId, amount: n, addCents });

  recordMoneyPathOpsSignal('wallet_topup_legacy_no_idempotency_key');
  await prisma.$transaction(async (tx) => {
    const prior = await tx.userWallet.findUnique({ where: { userId } });
    const priorBal = prior?.balanceUsdCents ?? DEFAULT_WALLET_USD_CENTS;
    const balAfter = priorBal + addCents;

    await tx.userWalletLedgerEntry.create({
      data: {
        referenceId,
        userId,
        direction: 'CREDIT',
        reason: USER_WALLET_LEDGER_REASON_WALLET_TOPUP_LEGACY,
        amountUsdCents: addCents,
        currency: 'USD',
        balanceAfterUsdCents: balAfter,
        idempotencyKey: null,
        metadataJson: topupMetadataJson('legacy_topup'),
      },
    });
    if (debugTopup) console.log('LEDGER INSERTED');

    await tx.userWallet.upsert({
      where: { userId },
      create: {
        userId,
        balanceUsdCents: balAfter,
        currency: 'USD',
      },
      update: {
        balanceUsdCents: { increment: addCents },
      },
    });
    if (debugTopup) console.log('BALANCE UPDATED');
  });

  if (debugTopup) {
    const count = await prisma.userWalletLedgerEntry.count({ where: { userId } });
    console.log('LEDGER COUNT:', count);
  }

  await assertLedgerMatchesWalletAfterTopup(userId, 'legacy');
  logWalletTopupEvent({
    result: 'legacy_ok',
    userIdSuffix: userId.slice(-8),
    amountUsd: n,
    idempotencyKey: null,
    referenceId,
  });

  return getWalletState(userId);
}

/**
 * DB-primary idempotent top-up (Redis never participates). Safe replays under network retries.
 */
export async function topupIdempotent(userId, amountUsd, idempotencyKey) {
  const n = Number(amountUsd);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be a positive number');
  }
  const addCents = Math.round(n * 100);
  assertTopupAmountCentsWithinPolicy(addCents);
  const key = String(idempotencyKey ?? '').trim();
  if (!key) {
    throw new Error('idempotency key required');
  }

  try {
    const out = await prisma.$transaction(async (tx) => {
      const existing = await tx.walletTopupIdempotency.findUnique({
        where: {
          userId_idempotencyKey: { userId, idempotencyKey: key },
        },
      });
      if (existing) {
        if (existing.amountUsdCents !== addCents) {
          recordMoneyPathOpsSignal('wallet_topup_fraud_idem_amount_mismatch');
          logWalletTopupEvent({
            result: 'fraud_idempotency_amount_mismatch',
            userIdSuffix: userId.slice(-8),
            amountUsd: n,
            addCents,
            idempotencyKey: key,
            storedCents: existing.amountUsdCents,
          });
          const err = new Error('Idempotency-Key reused with different amount');
          err.code = 'wallet_idempotency_conflict';
          throw err;
        }
        const stateRow = await tx.userWallet.findUnique({ where: { userId } });
        if (debugTopup) {
          console.log('REPLAY (no ledger insert)', {
            userId,
            idempotencyKeySuffix: key.slice(-8),
          });
        }
        return {
          idempotentReplay: true,
          balance: (stateRow?.balanceUsdCents ?? DEFAULT_WALLET_USD_CENTS) / 100,
          currency: stateRow?.currency ?? 'USD',
          referenceId: null,
        };
      }

      const referenceId = randomUUID();
      if (debugTopup) {
        console.log('TOPUP START', {
          userId,
          amount: n,
          addCents,
          idempotencyKeySuffix: key.slice(-8),
        });
      }

      logWalletTopupEvent({
        result: 'apply_begin',
        userIdSuffix: userId.slice(-8),
        amountUsd: n,
        addCents,
        idempotencyKey: key,
        referenceId,
      });

      await tx.walletTopupIdempotency.create({
        data: {
          userId,
          idempotencyKey: key,
          amountUsdCents: addCents,
        },
      });

      const prior = await tx.userWallet.findUnique({ where: { userId } });
      const priorBal = prior?.balanceUsdCents ?? DEFAULT_WALLET_USD_CENTS;
      const balAfter = priorBal + addCents;

      await tx.userWalletLedgerEntry.create({
        data: {
          referenceId,
          userId,
          direction: 'CREDIT',
          reason: USER_WALLET_LEDGER_REASON_WALLET_TOPUP,
          amountUsdCents: addCents,
          currency: 'USD',
          balanceAfterUsdCents: balAfter,
          idempotencyKey: key,
          metadataJson: topupMetadataJson('idempotent_topup'),
        },
      });
      if (debugTopup) console.log('LEDGER INSERTED');

      await tx.userWallet.upsert({
        where: { userId },
        create: {
          userId,
          balanceUsdCents: balAfter,
          currency: 'USD',
        },
        update: {
          balanceUsdCents: { increment: addCents },
        },
      });
      if (debugTopup) console.log('BALANCE UPDATED');

      return {
        idempotentReplay: false,
        balance: balAfter / 100,
        currency: prior?.currency ?? 'USD',
        referenceId,
      };
    });

    if (debugTopup && !out.idempotentReplay) {
      const count = await prisma.userWalletLedgerEntry.count({ where: { userId } });
      console.log('LEDGER COUNT:', count);
    }

    if (out.idempotentReplay) {
      recordMoneyPathOpsSignal('wallet_topup_idempotent_replay');
      logWalletTopupEvent({
        result: 'replay_ok',
        userIdSuffix: userId.slice(-8),
        amountUsd: n,
        idempotencyKey: key,
      });
    } else {
      recordMoneyPathOpsSignal('wallet_topup_idempotent_applied');
      await assertLedgerMatchesWalletAfterTopup(userId, 'apply');
      logWalletTopupEvent({
        result: 'apply_ok',
        userIdSuffix: userId.slice(-8),
        amountUsd: n,
        addCents,
        idempotencyKey: key,
        referenceId: out.referenceId,
      });
    }

    return {
      idempotentReplay: out.idempotentReplay,
      state: { balance: out.balance, currency: out.currency },
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const winner = await prisma.walletTopupIdempotency.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: key } },
      });
      if (winner && winner.amountUsdCents !== addCents) {
        recordMoneyPathOpsSignal('wallet_topup_fraud_idem_amount_mismatch');
        logWalletTopupEvent({
          result: 'fraud_idempotency_amount_mismatch',
          userIdSuffix: userId.slice(-8),
          amountUsd: n,
          addCents,
          idempotencyKey: key,
          storedCents: winner.amountUsdCents,
          phase: 'p2002_race',
        });
        const err = new Error('Idempotency-Key reused with different amount');
        err.code = 'wallet_idempotency_conflict';
        throw err;
      }
      recordMoneyPathOpsSignal('wallet_topup_idempotent_race_replay');
      if (debugTopup) {
        console.log('RACE REPLAY (no ledger insert)', {
          userId,
          idempotencyKeySuffix: key.slice(-8),
        });
      }
      logWalletTopupEvent({
        result: 'race_replay_ok',
        userIdSuffix: userId.slice(-8),
        amountUsd: n,
        idempotencyKey: key,
      });
      return {
        idempotentReplay: true,
        state: await getWalletState(userId),
      };
    }
    throw e;
  }
}
