/**
 * Soft fraud / velocity signals for WebTopupOrder (flags + AuditLog only — no hard blocks).
 */
import { createHash } from 'node:crypto';

import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { webTopupLog } from '../lib/webTopupObservability.js';

/**
 * @param {string} phoneNational
 * @param {string} destinationCountry
 */
export function hashPhoneVelocityKey(phoneNational, destinationCountry) {
  const n = String(phoneNational ?? '').replace(/\D/g, '');
  const cc = String(destinationCountry ?? '')
    .trim()
    .toUpperCase();
  return createHash('sha256')
    .update(`${cc}:${n}`, 'utf8')
    .digest('hex');
}

/**
 * Pure evaluation for unit tests.
 * @param {{
 *   sessionOrderCount: number;
 *   phoneHourOrderCount: number;
 *   phoneHourSameAmountCount: number;
 *   sessionWarn: number;
 *   phoneWarn: number;
 *   sameAmountWarn: number;
 * }} input
 */
export function evaluateVelocityThresholds(input) {
  const flags = [];
  if (input.sessionOrderCount >= input.sessionWarn) {
    flags.push('session_create_burst');
  }
  if (input.phoneHourOrderCount >= input.phoneWarn) {
    flags.push('phone_orders_hour_burst');
  }
  if (input.phoneHourSameAmountCount >= input.sameAmountWarn) {
    flags.push('phone_repeat_amount_burst');
  }
  return { flags, suspicious: flags.length > 0 };
}

/**
 * After a new WebTopupOrder insert (non-idempotent). Updates `fraudSignals` and may log.
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {import('pino').Logger | undefined} log
 */
export async function recordWebTopupOrderVelocitySignals(row, log) {
  const windowStart = new Date(Date.now() - env.webtopupVelocitySessionWindowMs);
  const hourBucket = new Date();
  hourBucket.setUTCMinutes(0, 0, 0);
  const hourKey = hourBucket.toISOString().slice(0, 13);

  const phoneHash = hashPhoneVelocityKey(row.phoneNumber, row.destinationCountry);

  const sessionOrderCount = await prisma.webTopupOrder.count({
    where: {
      sessionKey: row.sessionKey,
      createdAt: { gte: windowStart },
    },
  });

  const phoneHourOrderCount = await prisma.webTopupOrder.count({
    where: {
      phoneNumber: row.phoneNumber,
      destinationCountry: row.destinationCountry,
      createdAt: { gte: hourBucket },
    },
  });

  const phoneHourSameAmountCount = await prisma.webTopupOrder.count({
    where: {
      phoneNumber: row.phoneNumber,
      destinationCountry: row.destinationCountry,
      amountCents: row.amountCents,
      createdAt: { gte: hourBucket },
    },
  });

  await prisma.velocityWindow.upsert({
    where: {
      phoneHash_windowHour: { phoneHash, windowHour: hourKey },
    },
    create: {
      phoneHash,
      windowHour: hourKey,
      orderCount: 1,
      totalCents: row.amountCents,
    },
    update: {
      orderCount: { increment: 1 },
      totalCents: { increment: row.amountCents },
    },
  });

  const { flags, suspicious } = evaluateVelocityThresholds({
    sessionOrderCount,
    phoneHourOrderCount,
    phoneHourSameAmountCount,
    sessionWarn: env.webtopupVelocitySessionOrdersWarn,
    phoneWarn: env.webtopupVelocityPhoneHourOrdersWarn,
    sameAmountWarn: env.webtopupVelocityPhoneHourSameAmountWarn,
  });

  const fraudSignals = {
    v: 1,
    capturedAt: new Date().toISOString(),
    velocity: {
      sessionOrderCount,
      phoneHourOrderCount,
      phoneHourSameAmountCount,
      sessionWindowMs: env.webtopupVelocitySessionWindowMs,
    },
    flags,
  };

  await prisma.webTopupOrder.update({
    where: { id: row.id },
    data: { fraudSignals },
  });

  if (suspicious) {
    webTopupLog(log, 'warn', 'suspicious_pattern_detected', {
      kind: 'webtopup_velocity',
      orderIdSuffix: row.id.slice(-8),
      flags: flags.join(','),
      sessionKeySuffix: row.sessionKey.length > 4 ? row.sessionKey.slice(-4) : undefined,
    });
  }
}
