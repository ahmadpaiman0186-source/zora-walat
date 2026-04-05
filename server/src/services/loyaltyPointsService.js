import { Prisma } from '@prisma/client';

import { env } from '../config/env.js';
import {
  LOYALTY_LEDGER_SOURCE,
  LOYALTY_LEDGER_TYPE,
  loyaltyLedgerCheckoutRowId,
  loyaltyLedgerCheckoutSourceId,
} from '../constants/loyaltyLedger.js';

/** UTC `yyyy-MM` for leaderboard buckets. */
export function utcLeaderboardMonth(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

/**
 * Award loyalty for a single delivered checkout. Idempotent via unique `paymentCheckoutId`.
 * Call inside the same DB transaction that sets order → DELIVERED.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ id: string, userId: string | null, amountUsdCents: number }} order
 */
export async function grantLoyaltyPointsForDeliveredOrderInTx(tx, order) {
  const userId = order.userId;
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return { granted: false, reason: 'no_user' };
  }

  const basis = Math.max(1, env.loyaltyPointsUsdBasisCents);
  const cents = Math.max(0, Math.floor(Number(order.amountUsdCents) || 0));
  const points = Math.floor(cents / basis);
  if (points <= 0) {
    return { granted: false, reason: 'zero_points' };
  }

  const member = await tx.familyGroupMember.findUnique({
    where: { userId },
    select: { groupId: true },
  });
  const groupId = member?.groupId ?? null;
  const leaderboardMonth = utcLeaderboardMonth();

  const sourceId = loyaltyLedgerCheckoutSourceId(order.id);
  const ledgerId = loyaltyLedgerCheckoutRowId(order.id);

  try {
    await tx.loyaltyPointsGrant.create({
      data: {
        paymentCheckoutId: order.id,
        userId,
        groupId,
        points,
        amountUsdCents: cents,
        leaderboardMonth,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return { granted: false, reason: 'duplicate_checkout' };
    }
    throw e;
  }

  try {
    await tx.loyaltyLedger.create({
      data: {
        id: ledgerId,
        userId,
        source: LOYALTY_LEDGER_SOURCE.CHECKOUT_GRANT,
        sourceId,
        amount: points,
        type: LOYALTY_LEDGER_TYPE.CREDIT,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      /* ledger already recorded — idempotent with grant */
    } else {
      throw e;
    }
  }

  await tx.user.update({
    where: { id: userId },
    data: { loyaltyPointsTotal: { increment: points } },
  });

  if (groupId) {
    await tx.familyGroup.update({
      where: { id: groupId },
      data: { totalPoints: { increment: points } },
    });
  }

  return { granted: true, points, groupId, leaderboardMonth };
}
