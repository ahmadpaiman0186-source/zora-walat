import { prisma } from '../../db.js';
import { HttpError } from '../../lib/httpError.js';
import { RISK_REASON_CODE } from '../../constants/riskErrors.js';
import { evaluateRisk } from './riskEngine.js';
import { logRiskDecision } from './logRiskDecision.js';

const WINDOW_MS = 15 * 60 * 1000;
const DUP_WINDOW_MS = 3 * 60 * 1000;
const MAX_CHECKOUTS_PER_USER_PER_WINDOW = 30;
const MAX_SAME_FINGERPRINT_PER_DUP_WINDOW = 4;

/**
 * @param {{
 *   userId: string;
 *   packageId: string;
 *   recipientNational: string;
 *   log?: import('pino').Logger;
 *   traceId?: string | null;
 * }} p
 */
export async function assertRechargeOrderCreateRiskOrThrow(p) {
  const since = new Date(Date.now() - WINDOW_MS);
  const sinceDup = new Date(Date.now() - DUP_WINDOW_MS);

  const [userBurst, dupCount] = await Promise.all([
    prisma.paymentCheckout.count({
      where: {
        userId: p.userId,
        createdAt: { gte: since },
      },
    }),
    prisma.paymentCheckout.count({
      where: {
        userId: p.userId,
        packageId: p.packageId,
        recipientNational: p.recipientNational,
        createdAt: { gte: sinceDup },
      },
    }),
  ]);

  const flags = {
    rechargeUserBurst: userBurst >= MAX_CHECKOUTS_PER_USER_PER_WINDOW,
    rechargeDuplicateFingerprint: dupCount >= MAX_SAME_FINGERPRINT_PER_DUP_WINDOW,
  };

  const ev = evaluateRisk({
    kind: 'recharge_order',
    flags,
  });

  logRiskDecision(p.log, {
    route: 'POST /api/recharge/order',
    decision: ev.decision,
    reasonCode: ev.reasonCode,
    userId: p.userId,
    traceId: p.traceId ?? null,
    metadata: {
      ...ev.metadata,
      userBurstCount: userBurst,
      dupFingerprintCount: dupCount,
    },
  });

  if (ev.decision === 'deny') {
    const msg =
      ev.reasonCode === RISK_REASON_CODE.DUPLICATE_PATTERN
        ? 'Too many checkout attempts for the same package and number; wait and try again.'
        : 'Too many checkout attempts; try again later.';
    throw new HttpError(429, msg, { code: ev.reasonCode });
  }
}
