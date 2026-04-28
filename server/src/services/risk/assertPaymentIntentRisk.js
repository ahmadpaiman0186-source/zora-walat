import { HttpError } from '../../lib/httpError.js';
import { RISK_REASON_CODE } from '../../constants/riskErrors.js';
import { evaluateRisk } from './riskEngine.js';
import { incrementSlidingWindow } from './riskSlidingWindow.js';
import { logRiskDecision } from './logRiskDecision.js';

const WINDOW_MS = 15 * 60 * 1000;
/** Same amount from same IP in window — duplicate pattern. */
const MAX_SAME_AMOUNT_PI_PER_WINDOW = 12;
/** Total PI creates per IP in window — velocity. */
const MAX_PI_PER_IP_PER_WINDOW = 45;

/**
 * @param {import('express').Request} req
 * @param {{ amountCents: number; traceId?: string | null }} input
 */
export function assertPaymentIntentRiskAllowed(req, input) {
  const ipKey = String(req.ip || req.socket?.remoteAddress || '127.0.0.1').replace(
    /^::ffff:/,
    '',
  );
  const amt = Number(input.amountCents);
  const amountKey = `risk_pi_amt:${ipKey}:${amt}`;
  const ipKeyOnly = `risk_pi_ip:${ipKey}`;

  const amtStat = incrementSlidingWindow(amountKey, WINDOW_MS);
  const ipStat = incrementSlidingWindow(ipKeyOnly, WINDOW_MS);

  const flags = {
    paymentIntentAmountBurst: amtStat.count > MAX_SAME_AMOUNT_PI_PER_WINDOW,
    duplicateFingerprint: amtStat.count > MAX_SAME_AMOUNT_PI_PER_WINDOW,
    paymentIntentIpBurst: ipStat.count > MAX_PI_PER_IP_PER_WINDOW,
  };

  const ev = evaluateRisk({
    kind: 'payment_intent',
    flags,
  });

  logRiskDecision(req.log, {
    route: 'POST /create-payment-intent',
    decision: ev.decision,
    reasonCode: ev.reasonCode,
    userId: req.webtopupAuthUser?.id ?? null,
    traceId: input.traceId ?? req.traceId ?? null,
    metadata: {
      ...ev.metadata,
      amountCents: amt,
      sameAmountCount: amtStat.count,
      ipPiCount: ipStat.count,
    },
  });

  if (ev.decision === 'deny') {
    const msg =
      ev.reasonCode === RISK_REASON_CODE.DUPLICATE_PATTERN
        ? 'Too many payment attempts for this amount; try again later.'
        : 'Too many payment attempts from this network; try again later.';
    throw new HttpError(429, msg, { code: ev.reasonCode });
  }
}
