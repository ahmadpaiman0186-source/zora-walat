import { prisma } from '../db.js';
import { utcLeaderboardMonth } from './loyaltyPointsService.js';

/**
 * @param {string} yearMonth yyyy-MM
 * @param {number} limit
 * @returns {Promise<{ id: string, points: number }[]>}
 */
export async function topUsersByMonthLive(yearMonth, limit = 50) {
  /** @type {{ id: string, points: number }[]} */
  const rows = await prisma.$queryRaw`
    SELECT "userId" AS id, CAST(COALESCE(SUM("points"), 0) AS INT) AS points
    FROM "LoyaltyPointsGrant"
    WHERE "leaderboardMonth" = ${yearMonth}
    GROUP BY "userId"
    ORDER BY SUM("points") DESC
    LIMIT ${limit}
  `;
  return rows.map((r, i) => ({
    id: r.id,
    points: Number(r.points),
    rank: i + 1,
  }));
}

/**
 * @param {string} yearMonth
 * @param {number} limit
 */
export async function topGroupsByMonthLive(yearMonth, limit = 50) {
  /** @type {{ id: string, points: number }[]} */
  const rows = await prisma.$queryRaw`
    SELECT "groupId" AS id, CAST(COALESCE(SUM("points"), 0) AS INT) AS points
    FROM "LoyaltyPointsGrant"
    WHERE "leaderboardMonth" = ${yearMonth}
      AND "groupId" IS NOT NULL
    GROUP BY "groupId"
    ORDER BY SUM("points") DESC
    LIMIT ${limit}
  `;
  return rows.map((r, i) => ({
    id: r.id,
    points: Number(r.points),
    rank: i + 1,
  }));
}

/**
 * Snapshot rows for a closed month (idempotent). Uses USER + GROUP scopes.
 * Call from cron or admin when you want a frozen legal/audit copy.
 *
 * @param {string} yearMonth yyyy-MM (must be strictly before current UTC month)
 */
export async function freezeLeaderboardMonth(yearMonth) {
  const cur = utcLeaderboardMonth();
  if (yearMonth.localeCompare(cur) >= 0) {
    return { ok: false, error: 'month_not_closed' };
  }

  const exists = await prisma.loyaltyLeaderboardSnapshot.findFirst({
    where: { yearMonth },
  });
  if (exists) {
    return { ok: true, skipped: true };
  }

  const users = await prisma.$queryRaw`
    SELECT "userId" AS id, CAST(COALESCE(SUM("points"), 0) AS INT) AS points
    FROM "LoyaltyPointsGrant"
    WHERE "leaderboardMonth" = ${yearMonth}
    GROUP BY "userId"
    ORDER BY SUM("points") DESC
  `;

  const groups = await prisma.$queryRaw`
    SELECT "groupId" AS id, CAST(COALESCE(SUM("points"), 0) AS INT) AS points
    FROM "LoyaltyPointsGrant"
    WHERE "leaderboardMonth" = ${yearMonth}
      AND "groupId" IS NOT NULL
    GROUP BY "groupId"
    ORDER BY SUM("points") DESC
  `;

  let r = 1;
  for (const row of users) {
    await prisma.loyaltyLeaderboardSnapshot.create({
      data: {
        yearMonth,
        scope: 'USER',
        subjectId: row.id,
        points: Number(row.points),
        rank: r,
      },
    });
    r += 1;
  }

  r = 1;
  for (const row of groups) {
    await prisma.loyaltyLeaderboardSnapshot.create({
      data: {
        yearMonth,
        scope: 'GROUP',
        subjectId: row.id,
        points: Number(row.points),
        rank: r,
      },
    });
    r += 1;
  }

  return { ok: true, users: users.length, groups: groups.length };
}

/**
 * Leaderboard response: prefer snapshots for past months when present.
 *
 * @param {string} yearMonth
 * @param {'USER' | 'GROUP'} scope
 * @param {number} limit
 */
export async function getLeaderboard(yearMonth, scope, limit = 25) {
  const cur = utcLeaderboardMonth();
  const isPast = yearMonth < cur;

  if (isPast) {
    const snaps = await prisma.loyaltyLeaderboardSnapshot.findMany({
      where: { yearMonth, scope },
      orderBy: { rank: 'asc' },
      take: limit,
    });
    if (snaps.length > 0) {
      if (scope === 'GROUP') {
        const ids = snaps.map((s) => s.subjectId);
        const groups = await prisma.familyGroup.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, totalPoints: true },
        });
        const byId = new Map(groups.map((g) => [g.id, g]));
        return snaps.map((s) => ({
          rank: s.rank,
          points: s.points,
          group: byId.get(s.subjectId) ?? { id: s.subjectId, name: 'Group' },
        }));
      }
      return snaps.map((s) => ({
        rank: s.rank,
        points: s.points,
        userId: s.subjectId,
      }));
    }
  }

  if (scope === 'GROUP') {
    const live = await topGroupsByMonthLive(yearMonth, limit);
    const ids = live.map((x) => x.id);
    const groups = await prisma.familyGroup.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, totalPoints: true },
    });
    const byId = new Map(groups.map((g) => [g.id, g]));
    return live.map((row) => ({
      rank: row.rank,
      points: row.points,
      group: byId.get(row.id) ?? { id: row.id, name: 'Group' },
    }));
  }

  return topUsersByMonthLive(yearMonth, limit);
}

/** @param {string} userId */
export async function getLoyaltySummary(userId) {
  const yearMonth = utcLeaderboardMonth();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      loyaltyPointsTotal: true,
    },
  });

  const monthSum = await prisma.loyaltyPointsGrant.aggregate({
    where: { userId, leaderboardMonth: yearMonth },
    _sum: { points: true },
  });
  const monthPoints = monthSum._sum.points ?? 0;

  /** @type {{ rnk: bigint, pts: number }[]} */
  const rankRows = await prisma.$queryRaw`
    WITH scores AS (
      SELECT "userId", COALESCE(SUM("points"), 0)::int AS pts
      FROM "LoyaltyPointsGrant"
      WHERE "leaderboardMonth" = ${yearMonth}
      GROUP BY "userId"
    ),
    ranked AS (
      SELECT "userId", pts, RANK() OVER (ORDER BY pts DESC) AS rnk
      FROM scores
    )
    SELECT rnk, pts FROM ranked WHERE "userId" = ${userId}
  `;

  let userMonthlyRank = null;
  if (rankRows.length > 0) {
    userMonthlyRank = Number(rankRows[0].rnk);
  }

  const tiers = await prisma.loyaltyRewardTier.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  let currentTier = null;
  const placementRank = userMonthlyRank;
  if (placementRank != null) {
    for (const t of tiers) {
      const end = t.rankEnd ?? 999999;
      if (placementRank >= t.rankStart && placementRank <= end) {
        currentTier = t;
        break;
      }
    }
  }

  /** Better placement = lower rank number (#1 best). */
  let progressToNext = null;
  if (placementRank != null && placementRank > 1) {
    progressToNext = {
      ranksToMoveUp: placementRank - 1,
      message:
        'Recognition reflects completed qualifying orders this month — not draws or luck.',
    };
  }

  const member = await prisma.familyGroupMember.findUnique({
    where: { userId },
    include: { group: true },
  });

  let groupMonthly = null;
  if (member) {
    const gSum = await prisma.loyaltyPointsGrant.aggregate({
      where: { groupId: member.groupId, leaderboardMonth: yearMonth },
      _sum: { points: true },
    });
    const gPoints = gSum._sum.points ?? 0;

    /** @type {{ rnk: bigint }[]} */
    const gRankRows = await prisma.$queryRaw`
      WITH scores AS (
        SELECT "groupId", COALESCE(SUM("points"), 0)::int AS pts
        FROM "LoyaltyPointsGrant"
        WHERE "leaderboardMonth" = ${yearMonth}
          AND "groupId" IS NOT NULL
        GROUP BY "groupId"
      ),
      ranked AS (
        SELECT "groupId", pts, RANK() OVER (ORDER BY pts DESC) AS rnk
        FROM scores
      )
      SELECT rnk FROM ranked WHERE "groupId" = ${member.groupId}
    `;

    groupMonthly = {
      groupId: member.group.id,
      name: member.group.name,
      lifetimePoints: member.group.totalPoints,
      monthPoints: gPoints,
      monthRank: gRankRows.length ? Number(gRankRows[0].rnk) : null,
    };
  }

  return {
    yearMonth,
    user: {
      lifetimePoints: user?.loyaltyPointsTotal ?? 0,
      monthPoints,
      monthRank: userMonthlyRank,
    },
    group: groupMonthly,
    recognition: {
      currentTier: currentTier
        ? {
            label: currentTier.label,
            description: currentTier.description,
          }
        : null,
      next: progressToNext,
    },
    legalNote:
      'Zora-Walat recognition is based on qualifying completed purchases. There is no random drawing or prize game.',
  };
}