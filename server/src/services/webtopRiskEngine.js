import { prisma } from '../db.js';
import { webTopupLog } from '../lib/webTopupObservability.js';
import { FULFILLMENT_DB_ERROR } from '../domain/topupOrder/fulfillmentErrors.js';

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 * @returns {{ score: number; level: 'low' | 'medium' | 'high'; reasons: string[] }}
 */
export function computeWebTopupRiskAssessment(row) {
  let score = 0;
  const reasons = [];

  const fs = /** @type {{ flags?: string[] } | null} */ (row.fraudSignals);
  if (fs?.flags?.length) {
    score += Math.min(40, fs.flags.length * 12);
    reasons.push('fraud_signals');
  }

  const attempts = Number(row.fulfillmentAttemptCount ?? 0);
  if (attempts > 2) {
    score += Math.min(30, (attempts - 2) * 10);
    reasons.push('retry_abuse');
  }

  if (row.fulfillmentErrorCode === FULFILLMENT_DB_ERROR.RETRYABLE) {
    score += 15;
    reasons.push('last_retryable');
  }

  if (
    String(row.destinationCountry ?? '').toUpperCase() === 'AF' &&
    String(row.productType) === 'airtime' &&
    row.operatorKey &&
    row.productId &&
    !String(row.productId).toLowerCase().includes(String(row.operatorKey).toLowerCase().slice(0, 3))
  ) {
    score += 10;
    reasons.push('operator_product_mismatch_heuristic');
  }

  score = Math.min(100, score);
  let /** @type {'low' | 'medium' | 'high'} */ level = 'low';
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'medium';

  return { score, level, reasons };
}

/**
 * Persist assessment and emit structured log (no PII).
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 */
export async function persistWebTopupRiskAssessment(orderId, log) {
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) return;

  const { score, level, reasons } = computeWebTopupRiskAssessment(row);
  await prisma.webTopupOrder.update({
    where: { id: orderId },
    data: {
      riskScore: score,
      riskLevel: level,
    },
  });

  webTopupLog(log, 'info', 'fraud_risk_assessed', {
    orderIdSuffix: orderId.slice(-8),
    riskScore: score,
    riskLevel: level,
    reasonTags: reasons.join(','),
  });
}
