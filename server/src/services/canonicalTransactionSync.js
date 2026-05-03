/**
 * Mirrors domain rows into `CanonicalTransaction` (additive Phase 4 — not payment authority).
 */
import {
  CanonicalTransactionPhase,
  CanonicalTransactionSourceModel,
  Prisma,
} from '@prisma/client';

import {
  CANONICAL_PHASE,
  deriveCanonicalPhaseFromPaymentCheckout,
  deriveCanonicalPhaseFromWalletLedgerEntry,
  deriveCanonicalPhaseFromWebTopupOrder,
} from '../domain/canonicalTransactionProjection.js';
import { PAYMENT_STATUS } from '../domain/topupOrder/statuses.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { webTopupLog } from '../lib/webTopupObservability.js';

/** @typedef {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} DbTx */

/** Migration not applied yet, or shadow DB without new table — mirror is best-effort only. */
function isCanonicalTableUnavailableError(e) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === 'P2021' ||
      (typeof e.message === 'string' &&
        e.message.includes('CanonicalTransaction')))
  );
}

/**
 * Stable global idempotency keys (avoid collisions across WEBTOPUP / PHASE1 / WALLET).
 * @param {{ id: string, idempotencyKey?: string | null }} order
 */
export function canonicalIdempotencyKeyWebtopup(order) {
  const client = order.idempotencyKey?.trim();
  if (client) return `canonical:webtopup:idem:${client}`;
  return `canonical:webtopup:oid:${order.id}`;
}

/** @param {{ id: string, idempotencyKey: string }} checkout */
export function canonicalIdempotencyKeyPhase1(checkout) {
  return `canonical:phase1:cid:${checkout.id}`;
}

/** @param {string} ledgerReferenceId */
export function canonicalIdempotencyKeyWallet(ledgerReferenceId) {
  return `canonical:wallet:ref:${ledgerReferenceId}`;
}

/**
 * @param {string | null | undefined} phaseStr
 * @returns {import('@prisma/client').CanonicalTransactionPhase}
 */
export function prismaPhaseFromCanonicalString(phaseStr) {
  const p = phaseStr ?? CANONICAL_PHASE.PENDING;
  const map = {
    [CANONICAL_PHASE.PENDING]: CanonicalTransactionPhase.PENDING,
    [CANONICAL_PHASE.PAYMENT_INITIATED]: CanonicalTransactionPhase.PAYMENT_INITIATED,
    [CANONICAL_PHASE.PAYMENT_CONFIRMED]: CanonicalTransactionPhase.PAYMENT_CONFIRMED,
    [CANONICAL_PHASE.PROCESSING]: CanonicalTransactionPhase.PROCESSING,
    [CANONICAL_PHASE.SUCCESS]: CanonicalTransactionPhase.SUCCESS,
    [CANONICAL_PHASE.FAILED]: CanonicalTransactionPhase.FAILED,
    [CANONICAL_PHASE.REFUNDED]: CanonicalTransactionPhase.REFUNDED,
  };
  return map[p] ?? CanonicalTransactionPhase.PENDING;
}

/**
 * Race-safe advance to PAYMENT_CONFIRMED only from pre-confirm phases (empty update = no-op).
 * @param {DbTx} tx
 * @param {'WEBTOPUP' | 'PHASE1'} sourceModel
 * @param {string} sourceId
 * @param {string | null | undefined} externalPaymentId
 */
export async function lockedAdvancePaymentConfirmedIfPreconfirmPhase(
  tx,
  sourceModel,
  sourceId,
  externalPaymentId,
) {
  if (!tx.canonicalTransaction?.updateMany) return { count: 0 };
  const sm =
    sourceModel === 'PHASE1'
      ? CanonicalTransactionSourceModel.PHASE1
      : CanonicalTransactionSourceModel.WEBTOPUP;
  try {
    return await tx.canonicalTransaction.updateMany({
      where: {
        sourceModel: sm,
        sourceId,
        phase: {
          in: [
            CanonicalTransactionPhase.PENDING,
            CanonicalTransactionPhase.PAYMENT_INITIATED,
          ],
        },
      },
      data: {
        phase: CanonicalTransactionPhase.PAYMENT_CONFIRMED,
        ...(externalPaymentId
          ? { externalPaymentId: String(externalPaymentId) }
          : {}),
      },
    });
  } catch (e) {
    if (isCanonicalTableUnavailableError(e)) return { count: 0 };
    throw e;
  }
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {import('@prisma/client').CanonicalTransactionPhase} targetPhase
 */
export function shouldUseLockedPaymentConfirmForWebtopup(row, targetPhase) {
  return (
    targetPhase === CanonicalTransactionPhase.PAYMENT_CONFIRMED &&
    row.paymentStatus === PAYMENT_STATUS.PAID
  );
}

/**
 * @param {DbTx} tx
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {{ warn?: Function, info?: Function } | undefined} log
 */
export async function mirrorCanonicalWebTopupOrder(tx, row, log) {
  if (!tx.canonicalTransaction?.upsert) return;
  try {
    const derived = deriveCanonicalPhaseFromWebTopupOrder(row);
    const targetPhase = prismaPhaseFromCanonicalString(
      derived ?? CANONICAL_PHASE.PENDING,
    );
    const idem = canonicalIdempotencyKeyWebtopup(row);

    const prev = await tx.canonicalTransaction.findUnique({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.WEBTOPUP,
          sourceId: row.id,
        },
      },
      select: { phase: true },
    });

    if (shouldUseLockedPaymentConfirmForWebtopup(row, targetPhase)) {
      await lockedAdvancePaymentConfirmedIfPreconfirmPhase(
        tx,
        'WEBTOPUP',
        row.id,
        row.paymentIntentId,
      );
    }

    await tx.canonicalTransaction.upsert({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.WEBTOPUP,
          sourceId: row.id,
        },
      },
      create: {
        sourceModel: CanonicalTransactionSourceModel.WEBTOPUP,
        sourceId: row.id,
        userId: row.userId,
        amount: row.amountCents,
        currency: String(row.currency ?? 'usd').toLowerCase(),
        provider: row.fulfillmentProvider ?? 'stripe',
        externalPaymentId: row.paymentIntentId,
        idempotencyKey: idem,
        phase: targetPhase,
      },
      update: {
        userId: row.userId,
        amount: row.amountCents,
        currency: String(row.currency ?? 'usd').toLowerCase(),
        provider: row.fulfillmentProvider ?? 'stripe',
        externalPaymentId: row.paymentIntentId,
        idempotencyKey: idem,
        phase: targetPhase,
      },
    });

    if (
      log &&
      prev?.phase !== CanonicalTransactionPhase.PAYMENT_CONFIRMED &&
      targetPhase === CanonicalTransactionPhase.PAYMENT_CONFIRMED
    ) {
      webTopupLog(log, 'info', 'canonical_payment_confirmed_visible', {
        sourceModel: 'WEBTOPUP',
        orderIdSuffix: row.id.slice(-8),
        traceSurface: 'canonical_engine_v1',
      });
    }
  } catch (e) {
    if (isCanonicalTableUnavailableError(e)) return;
    throw e;
  }
}

/**
 * @param {DbTx} tx
 * @param {string} orderId
 * @param {{ warn?: Function, info?: Function } | undefined} log
 */
export async function mirrorCanonicalWebTopupOrderById(tx, orderId, log) {
  const row = await tx.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) return;
  await mirrorCanonicalWebTopupOrder(tx, row, log);
}

/**
 * @param {DbTx} tx
 * @param {import('@prisma/client').PaymentCheckout} row
 * @param {{ warn?: Function, info?: Function } | undefined} log
 */
export async function mirrorCanonicalPaymentCheckout(tx, row, log) {
  if (!tx.canonicalTransaction?.upsert) return;
  try {
    const derived = deriveCanonicalPhaseFromPaymentCheckout(row);
    const targetPhase = prismaPhaseFromCanonicalString(
      derived ?? CANONICAL_PHASE.PENDING,
    );
    const idem = canonicalIdempotencyKeyPhase1(row);

    const prev = await tx.canonicalTransaction.findUnique({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.PHASE1,
          sourceId: row.id,
        },
      },
      select: { phase: true },
    });

    if (
      targetPhase === CanonicalTransactionPhase.PAYMENT_CONFIRMED &&
      row.orderStatus === ORDER_STATUS.PAID
    ) {
      await lockedAdvancePaymentConfirmedIfPreconfirmPhase(
        tx,
        'PHASE1',
        row.id,
        row.stripePaymentIntentId,
      );
    }

    await tx.canonicalTransaction.upsert({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.PHASE1,
          sourceId: row.id,
        },
      },
      create: {
        sourceModel: CanonicalTransactionSourceModel.PHASE1,
        sourceId: row.id,
        userId: row.userId,
        amount: row.amountUsdCents,
        currency: String(row.currency ?? 'usd').toLowerCase(),
        provider: row.provider ?? 'stripe',
        externalPaymentId: row.stripePaymentIntentId,
        idempotencyKey: idem,
        phase: targetPhase,
      },
      update: {
        userId: row.userId,
        amount: row.amountUsdCents,
        currency: String(row.currency ?? 'usd').toLowerCase(),
        provider: row.provider ?? 'stripe',
        externalPaymentId: row.stripePaymentIntentId,
        idempotencyKey: idem,
        phase: targetPhase,
      },
    });

    if (
      log &&
      prev?.phase !== CanonicalTransactionPhase.PAYMENT_CONFIRMED &&
      targetPhase === CanonicalTransactionPhase.PAYMENT_CONFIRMED
    ) {
      webTopupLog(log, 'info', 'canonical_payment_confirmed_visible', {
        sourceModel: 'PHASE1',
        orderIdSuffix: row.id.slice(-12),
        traceSurface: 'canonical_engine_v1',
      });
    }
  } catch (e) {
    if (isCanonicalTableUnavailableError(e)) return;
    throw e;
  }
}

/**
 * @param {DbTx} tx
 * @param {string} checkoutId
 * @param {{ warn?: Function, info?: Function } | undefined} log
 */
export async function mirrorCanonicalPaymentCheckoutById(tx, checkoutId, log) {
  const row = await tx.paymentCheckout.findUnique({ where: { id: checkoutId } });
  if (!row) return;
  await mirrorCanonicalPaymentCheckout(tx, row, log);
}

/**
 * @param {DbTx} tx
 * @param {import('@prisma/client').UserWalletLedgerEntry} entry
 * @param {{ warn?: Function, info?: Function } | undefined} log
 */
export async function mirrorCanonicalWalletLedgerEntry(tx, entry, log) {
  if (!tx.canonicalTransaction?.upsert) return;
  try {
    const derived = deriveCanonicalPhaseFromWalletLedgerEntry(entry);
    if (!derived) return;
    const targetPhase = prismaPhaseFromCanonicalString(derived);
    const idem = canonicalIdempotencyKeyWallet(entry.referenceId);

    await tx.canonicalTransaction.upsert({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.WALLET,
          sourceId: entry.referenceId,
        },
      },
      create: {
        sourceModel: CanonicalTransactionSourceModel.WALLET,
        sourceId: entry.referenceId,
        userId: entry.userId,
        amount: entry.amountUsdCents,
        currency: String(entry.currency ?? 'usd').toLowerCase(),
        provider: 'user_wallet',
        externalPaymentId: null,
        idempotencyKey: idem,
        phase: targetPhase,
      },
      update: {
        userId: entry.userId,
        amount: entry.amountUsdCents,
        currency: String(entry.currency ?? 'usd').toLowerCase(),
        phase: targetPhase,
      },
    });

    if (log) {
      webTopupLog(log, 'info', 'canonical_wallet_mirror', {
        referenceIdSuffix: entry.referenceId.slice(-8),
        phase: targetPhase,
        traceSurface: 'canonical_engine_v1',
      });
    }
  } catch (e) {
    if (isCanonicalTableUnavailableError(e)) return;
    throw e;
  }
}
