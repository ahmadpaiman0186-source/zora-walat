import { randomBytes } from 'node:crypto';

import { prisma } from '../db.js';

function generateInviteCode() {
  return `fg_${randomBytes(8).toString('base64url').replace(/=/g, '').slice(0, 12)}`;
}

/**
 * @param {string} userId
 * @param {string} name
 */
export async function createFamilyGroup(userId, name) {
  const trimmed = String(name ?? '').trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    return { ok: false, status: 400, error: 'invalid_name' };
  }

  const existingMember = await prisma.familyGroupMember.findUnique({
    where: { userId },
  });
  if (existingMember) {
    return { ok: false, status: 409, error: 'already_in_group' };
  }

  const owned = await prisma.familyGroup.findUnique({
    where: { ownerUserId: userId },
  });
  if (owned) {
    return { ok: false, status: 409, error: 'already_own_group' };
  }

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i += 1) {
    try {
      const group = await prisma.$transaction(async (tx) => {
        const g = await tx.familyGroup.create({
          data: {
            name: trimmed,
            ownerUserId: userId,
            inviteCode,
            totalPoints: 0,
          },
        });
        await tx.familyGroupMember.create({
          data: {
            groupId: g.id,
            userId,
            role: 'owner',
          },
        });
        return g;
      });
      return { ok: true, group };
    } catch (e) {
      if (e?.code === 'P2002') {
        inviteCode = generateInviteCode();
        continue;
      }
      throw e;
    }
  }
  return { ok: false, status: 500, error: 'invite_collision' };
}

/** @param {string} userId */
export async function getMyFamilyContext(userId) {
  const member = await prisma.familyGroupMember.findUnique({
    where: { userId },
    include: { group: true },
  });
  if (!member) {
    return { group: null, membership: null };
  }
  const others = await prisma.familyGroupMember.count({
    where: { groupId: member.groupId, userId: { not: userId } },
  });
  return {
    membership: {
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      otherMemberCount: others,
    },
    group: {
      id: member.group.id,
      name: member.group.name,
      inviteCode: member.group.inviteCode,
      totalPoints: member.group.totalPoints,
      ownerUserId: member.group.ownerUserId,
    },
  };
}

/**
 * @param {string} userId
 * @param {string} rawCode
 */
export async function joinFamilyGroup(userId, rawCode) {
  const code = String(rawCode ?? '').trim();
  if (code.length < 4) {
    return { ok: false, status: 400, error: 'invalid_code' };
  }

  const taken = await prisma.familyGroupMember.findUnique({
    where: { userId },
  });
  if (taken) {
    return { ok: false, status: 409, error: 'already_in_group' };
  }

  const group = await prisma.familyGroup.findUnique({
    where: { inviteCode: code },
  });
  if (!group) {
    return { ok: false, status: 404, error: 'group_not_found' };
  }

  await prisma.familyGroupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: 'member',
    },
  });

  const fresh = await prisma.familyGroup.findUnique({
    where: { id: group.id },
    select: { id: true, name: true, totalPoints: true, ownerUserId: true },
  });
  return { ok: true, group: fresh };
}

/**
 * Owner-only: delete group and all memberships.
 * @param {string} userId
 */
export async function dissolveFamilyGroup(userId) {
  const owned = await prisma.familyGroup.findUnique({
    where: { ownerUserId: userId },
  });
  if (!owned) {
    return { ok: false, status: 404, error: 'not_group_owner' };
  }
  await prisma.familyGroup.delete({ where: { id: owned.id } });
  return { ok: true };
}

/**
 * Non-owner members may leave. Owners must dissolve instead.
 * @param {string} userId
 */
export async function leaveFamilyGroup(userId) {
  const member = await prisma.familyGroupMember.findUnique({
    where: { userId },
    include: { group: true },
  });
  if (!member) {
    return { ok: false, status: 404, error: 'not_in_group' };
  }
  if (member.role === 'owner' || member.group.ownerUserId === userId) {
    return { ok: false, status: 409, error: 'owner_must_dissolve' };
  }
  await prisma.familyGroupMember.delete({ where: { id: member.id } });
  return { ok: true };
}
