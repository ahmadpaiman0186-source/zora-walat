import { Prisma } from '@prisma/client';

import { prisma } from '../../db.js';
import { HttpError } from '../../lib/httpError.js';
import { REFERRAL_STATUS } from '../../constants/referral.js';
import { hashReferralCorrelation } from '../../lib/referralPrivacyHash.js';
import { normalizeReferralCodeInput, ensureUserReferralCode } from './referralCodeService.js';
import { getReferralProgramConfig } from './referralProgramConfigService.js';
import { evaluateReferralAbuseSignals } from './referralAbuseService.js';
import { logReferralEvent } from '../../lib/referralLog.js';
import { getTraceId } from '../../lib/requestContext.js';

/**
 * @param {object} p
 * @param {string} p.invitedUserId
 * @param {string} p.rawCode
 * @param {string | null | undefined} p.clientIp
 * @param {string | null | undefined} p.deviceFingerprint
 */
export async function applyReferralCodeForUser(p) {
  const cfg = await getReferralProgramConfig();
  if (!cfg.referralEnabled) {
    throw new HttpError(403, 'Referrals are not available right now');
  }

  const codeNorm = normalizeReferralCodeInput(p.rawCode);
  if (codeNorm.length < 4) {
    throw new HttpError(400, 'Invalid referral code');
  }

  await ensureUserReferralCode(p.invitedUserId);

  const inviter = await prisma.user.findFirst({
    where: { referralCode: codeNorm },
    select: { id: true, email: true, signupIpHash: true, referralCode: true },
  });

  if (!inviter) {
    throw new HttpError(400, 'Invalid referral code');
  }
  if (inviter.id === p.invitedUserId) {
    throw new HttpError(400, 'Invalid referral code');
  }

  const invitee = await prisma.user.findUnique({
    where: { id: p.invitedUserId },
    select: { id: true, email: true, signupIpHash: true },
  });
  if (!invitee) {
    throw new HttpError(400, 'Invalid request');
  }

  const appliedIpHash = hashReferralCorrelation(p.clientIp);
  const appliedDeviceFingerprintHash = hashReferralCorrelation(
    p.deviceFingerprint,
  );

  const abuse = await evaluateReferralAbuseSignals({
    inviter,
    invitee,
    appliedIpHash,
    inviterUserId: inviter.id,
    currentInviteeUserId: p.invitedUserId,
  });

  const fraudFlags = {
    flags: abuse.flags,
    evaluatedAt: new Date().toISOString(),
  };

  try {
    const ref = await prisma.referral.create({
      data: {
        inviterUserId: inviter.id,
        invitedUserId: p.invitedUserId,
        status: REFERRAL_STATUS.PENDING,
        referralCodeUsed: codeNorm,
        fraudFlags,
        invitedSignupIpHash: invitee.signupIpHash,
        appliedIpHash: appliedIpHash ?? undefined,
        appliedDeviceFingerprintHash:
          appliedDeviceFingerprintHash ?? undefined,
      },
    });
    logReferralEvent('referral_created', {
      traceId: getTraceId(),
      referralId: ref.id,
      inviterUserId: inviter.id,
      invitedUserId: p.invitedUserId,
      extra: { codeLen: codeNorm.length },
    });
    return { ok: true, referralId: ref.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'Referral already applied');
    }
    throw e;
  }
}
