import { prisma } from '../../db.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { evaluateRisk } from './riskEngine.js';
import { logRiskDecision } from './logRiskDecision.js';
import { hashPhoneVelocityKey } from '../webtopVelocitySignals.js';

/**
 * Hard-blocks web top-up order creation when velocity thresholds are exceeded (same windows as soft signals).
 *
 * @param {{
 *   sessionKey: string;
 *   rawInput: {
 *     phoneNumber: string;
 *     destinationCountry: string;
 *     amountCents: number;
 *   };
 *   log?: import('pino').Logger;
 *   traceId?: string | null;
 * }} p
 */
export async function assertWebTopupOrderCreateRiskOrThrow(p) {
  const windowStart = new Date(Date.now() - env.webtopupVelocitySessionWindowMs);
  const hourBucket = new Date();
  hourBucket.setUTCMinutes(0, 0, 0);

  const [sessionOrderCount, phoneHourOrderCount, phoneHourSameAmountCount] =
    await Promise.all([
      prisma.webTopupOrder.count({
        where: {
          sessionKey: p.sessionKey,
          createdAt: { gte: windowStart },
        },
      }),
      prisma.webTopupOrder.count({
        where: {
          phoneNumber: p.rawInput.phoneNumber,
          destinationCountry: p.rawInput.destinationCountry,
          createdAt: { gte: hourBucket },
        },
      }),
      prisma.webTopupOrder.count({
        where: {
          phoneNumber: p.rawInput.phoneNumber,
          destinationCountry: p.rawInput.destinationCountry,
          amountCents: p.rawInput.amountCents,
          createdAt: { gte: hourBucket },
        },
      }),
    ]);

  const phoneHash = hashPhoneVelocityKey(
    p.rawInput.phoneNumber,
    p.rawInput.destinationCountry,
  );

  const flags = {
    webtopupSessionBurst:
      sessionOrderCount >= env.webtopupVelocitySessionOrdersWarn,
    webtopupPhoneBurst:
      phoneHourOrderCount >= env.webtopupVelocityPhoneHourOrdersWarn,
    webtopupSameAmountBurst:
      phoneHourSameAmountCount >= env.webtopupVelocityPhoneHourSameAmountWarn,
    duplicateFingerprint:
      phoneHourSameAmountCount >= env.webtopupVelocityPhoneHourSameAmountWarn,
  };

  const ev = evaluateRisk({
    kind: 'webtopup_create',
    flags,
  });

  logRiskDecision(p.log, {
    route: 'POST /api/topup-orders',
    decision: ev.decision,
    reasonCode: ev.reasonCode,
    sessionKey: p.sessionKey,
    traceId: p.traceId ?? null,
    metadata: {
      ...ev.metadata,
      sessionOrderCount,
      phoneHourOrderCount,
      phoneHourSameAmountCount,
      phoneHashPrefix: phoneHash.slice(0, 12),
    },
  });

  if (ev.decision === 'deny') {
    throw new HttpError(
      429,
      'Order rate or pattern limits exceeded; try again later.',
      { code: ev.reasonCode },
    );
  }
}
