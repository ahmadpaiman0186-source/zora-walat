import {
  createFamilyGroup,
  dissolveFamilyGroup,
  getMyFamilyContext,
  joinFamilyGroup,
  leaveFamilyGroup,
} from '../services/familyGroupService.js';
import {
  getLeaderboard,
  getLoyaltySummary,
} from '../services/loyaltyLeaderboardService.js';
import { utcLeaderboardMonth } from '../services/loyaltyPointsService.js';
import { prisma } from '../db.js';

function parseMonth(raw) {
  const s = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return utcLeaderboardMonth();
}

export async function getSummary(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const summary = await getLoyaltySummary(userId);
  res.json(summary);
}

export async function getTiers(_req, res) {
  const tiers = await prisma.loyaltyRewardTier.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      rankStart: true,
      rankEnd: true,
      label: true,
      description: true,
      sortOrder: true,
    },
  });
  res.json({ tiers });
}

export async function getLeaderboardHandler(req, res) {
  const month = parseMonth(req.query.month);
  const scopeRaw = String(req.query.scope ?? 'groups').toLowerCase();
  const scope = scopeRaw === 'users' ? 'USER' : 'GROUP';
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 25));
  const rows = await getLeaderboard(month, scope, limit);
  res.json({ yearMonth: month, scope, entries: rows });
}

export async function postCreateGroup(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const name = req.body?.name;
  const result = await createFamilyGroup(userId, name);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  res.status(201).json({ group: result.group });
}

export async function getMyGroup(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const ctx = await getMyFamilyContext(userId);
  res.json(ctx);
}

export async function postJoinGroup(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const inviteCode = req.body?.inviteCode;
  const result = await joinFamilyGroup(userId, inviteCode);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ group: result.group });
}

export async function postDissolveGroup(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const result = await dissolveFamilyGroup(userId);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  res.status(204).end();
}

export async function postLeaveGroup(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const result = await leaveFamilyGroup(userId);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  res.status(204).end();
}
