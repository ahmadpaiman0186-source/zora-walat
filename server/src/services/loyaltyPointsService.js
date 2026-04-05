import { Prisma } from '@prisma/client';

import { env } from '../config/env.js';

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
