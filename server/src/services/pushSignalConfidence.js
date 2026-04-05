import { prisma } from '../db.js';
import { env } from '../config/env.js';

/**
 * Higher score → user likely cares about push; low score → inbox gap is weaker signal.
 * @param {string} userId
 */
export async function scorePushDeliveryExpectation(userId) {
  let score = 0;
  const deviceCount = await prisma.pushDevice.count({ where: { userId } });
  if (deviceCount > 0) score += 2;
  if (env.pushNotificationsEnabled) score += 2;
  const recentInbox = await prisma.userNotification.findFirst({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 14 * 86400_000) },
    },
    select: { id: true },
  });
  if (recentInbox) score += 1;
  return {
    score,
    deviceCount,
    pushEnabled: env.pushNotificationsEnabled,
    recentInboxActivity: Boolean(recentInbox),
  };
}

/**
 * @param {Awaited<ReturnType<typeof scorePushDeliveryExpectation>>} s
 * @returns {'high' | 'low'}
 */
export function pushExpectationBand(s) {
  return s.score >= 4 ? 'high' : 'low';
}
