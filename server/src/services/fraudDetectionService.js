/**
 * Fraud risk scoring (0–100): velocity, repeated payer, fingerprint bursts, amount outliers, failed attempts.
 * Persists `fraudRiskScore` + `fraudSignals` on `PaymentCheckout`. No PII in logs.
 */

import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { env } from '../config/env.js';
import { emitMoneyPathAlert } from './moneyPathAlertService.js';
import {
  bumpFraudDetectionMetric,
  emitResilienceStructuredLog,
} from '../utils/metrics.js';

const VELOCITY_MS = 15 * 60 * 1000;
const REPEAT_CUSTOMER_MS = 24 * 60 * 60 * 1000;
const FINGERPRINT_WINDOW_MS = 60 * 60 * 1000;

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} checkoutId
 * @param {Date} [now]
 */
export async function collectFraudAggregatesForOrder(tx, checkoutId, now = new Date()) {
  const row = await tx.paymentCheckout.findUnique({
    where: { id: checkoutId },
    select: {
      id: true,
      userId: true,
      stripeCustomerId: true,
      requestFingerprint: true,
      amountUsdCents: true,
    },
  });
  if (!row) return null;

  const sinceV = new Date(now.getTime() - VELOCITY_MS);
  const sinceR = new Date(now.getTime() - REPEAT_CUSTOMER_MS);
  const sinceF = new Date(now.getTime() - FINGERPRINT_WINDOW_MS);

  const basePaid = {
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    orderStatus: { not: ORDER_STATUS.PENDING },
    paidAt: { not: null },
  };

  const [
    velocityUser15m,
    sameCustomer24h,
    fingerprint1h,
    failedAttemptsOnOrder,
    peerAmountRows,
  ] = await Promise.all([
    row.userId
      ? tx.paymentCheckout.count({
          where: {
            ...basePaid,
            userId: row.userId,
            paidAt: { gte: sinceV },
            id: { not: checkoutId },
          },
        })
      : 0,
    row.stripeCustomerId
      ? tx.paymentCheckout.count({
          where: {
            ...basePaid,
            stripeCustomerId: row.stripeCustomerId,
            paidAt: { gte: sinceR },
            id: { not: checkoutId },
          },
        })
      : 0,
    row.requestFingerprint
      ? tx.paymentCheckout.count({
          where: {
            requestFingerprint: row.requestFingerprint,
            createdAt: { gte: sinceF },
            id: { not: checkoutId },
          },
        })
      : 0,
    tx.fulfillmentAttempt.count({
      where: { orderId: checkoutId, status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
    }),
    row.userId
      ? tx.paymentCheckout.findMany({
          where: {
            userId: row.userId,
            id: { not: checkoutId },
            amountUsdCents: { gt: 0 },
          },
          select: { amountUsdCents: true },
          orderBy: { createdAt: 'desc' },
          take: 14,
        })
      : [],
  ]);

  const peers = peerAmountRows.map((r) => r.amountUsdCents).filter((n) => Number.isFinite(n));
  const med = median(peers);
  const amt = Math.max(0, Math.floor(Number(row.amountUsdCents) || 0));
  const abnormalAmount =
    amt >= env.fraudAbnormalAmountUsdCents ||
    (med > 0 && amt > med * env.fraudAbnormalAmountMultiplier);

  return {
    velocityUser15m,
    sameCustomer24h,
    fingerprint1h,
    failedAttemptsOnOrder,
    abnormalAmount,
  };
}

/**
 * @param {NonNullable<Awaited<ReturnType<typeof collectFraudAggregatesForOrder>>>} a
 */
export function scoreFromFraudAggregates(a) {
  let score = 0;
  /** @type {string[]} */
  const codes = [];

  if (a.sameCustomer24h >= 3) {
    score += 28;
    codes.push('repeat_customer_24h_ge3');
  } else if (a.sameCustomer24h >= 2) {
    score += 14;
    codes.push('repeat_customer_24h_2');
  }

  if (a.velocityUser15m >= 5) {
    score += 32;
    codes.push('velocity_user_ge5');
  } else if (a.velocityUser15m >= 3) {
    score += 18;
    codes.push('velocity_user_ge3');
  }

  if (a.fingerprint1h >= 6) {
    score += 24;
    codes.push('fingerprint_velocity_ge6');
  } else if (a.fingerprint1h >= 4) {
    score += 14;
    codes.push('fingerprint_velocity_ge4');
  }

  if (a.abnormalAmount) {
    score += 22;
    codes.push('abnormal_amount');
  }

  if (a.failedAttemptsOnOrder >= 2) {
    score += Math.min(28, 14 * a.failedAttemptsOnOrder);
    codes.push('failed_attempt_pattern');
  } else if (a.failedAttemptsOnOrder === 1) {
    score += 8;
    codes.push('failed_attempt_once');
  }

  return { score: Math.min(100, score), codes };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} checkoutId
 * @param {{ traceId?: string | null }} [opts]
 */
export async function persistFraudAssessmentInTx(tx, checkoutId, opts = {}) {
  const traceId = opts.traceId ?? null;
  const agg = await collectFraudAggregatesForOrder(tx, checkoutId);
  if (!agg) return { ok: false, code: 'not_found' };

  const { score, codes } = scoreFromFraudAggregates(agg);
  await tx.paymentCheckout.updateMany({
    where: { id: checkoutId },
    data: {
      fraudRiskScore: score,
      fraudSignals: codes,
    },
  });

  if (score >= env.fraudRiskAlertThreshold) {
    bumpFraudDetectionMetric('alert');
    emitMoneyPathAlert('warn', 'fraud_risk_elevated', {
      orderId: checkoutId,
      traceId,
      extra: { fraudRiskScore: score, signals: codes },
    });
    emitResilienceStructuredLog({
      orderId: checkoutId,
      checkoutId,
      stage: 'payment',
      status: 'fraud_risk_elevated',
      traceId,
      extra: { fraudRiskScore: score },
    });
  }

  if (score >= env.fraudRiskFulfillmentBlockThreshold) {
    bumpFraudDetectionMetric('block');
    emitMoneyPathAlert('critical', 'fraud_risk_block', {
      orderId: checkoutId,
      traceId,
      extra: { fraudRiskScore: score, signals: codes },
    });
  }

  return { ok: true, fraudRiskScore: score, codes };
}
