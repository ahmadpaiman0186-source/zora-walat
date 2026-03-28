import { config } from '../config.js';
import { phoneHash } from '../lib/phone.js';

function utcHourKey() {
  const d = new Date();
  return d.toISOString().slice(0, 13);
}

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lightweight fraud checks (expand with Redis / device binding in production).
 */
export async function runFraudChecks({
  prisma,
  nationalPhone,
  amountUsdCents,
  clientIp,
}) {
  const reasons = [];
  let score = 0;

  if (!nationalPhone) {
    score += 100;
    reasons.push('missing_phone');
    return { ok: false, score, reasons };
  }

  const ph = phoneHash(nationalPhone);
  const hour = utcHourKey();

  const velocity = await prisma.velocityWindow.upsert({
    where: { phoneHash_windowHour: { phoneHash: ph, windowHour: hour } },
    create: { phoneHash: ph, windowHour: hour, totalCents: 0, orderCount: 0 },
    update: {},
  });

  if (velocity.orderCount >= config.velocityMaxOrdersPerPhonePerHour) {
    score += 60;
    reasons.push('velocity_hourly_orders');
  }

  const dayStart = new Date(`${utcDayKey()}T00:00:00.000Z`);
  const dayTotal = await prisma.topupOrder.aggregate({
    _sum: { amountUsdCents: true },
    where: {
      recipientNational: nationalPhone,
      status: { in: ['FULFILLED', 'FULFILLING', 'PAID'] },
      createdAt: { gte: dayStart },
    },
  });

  const spent = dayTotal._sum.amountUsdCents || 0;
  if (spent + amountUsdCents > config.maxTopupUsdCentsPerPhonePerDay) {
    score += 50;
    reasons.push('daily_amount_cap');
  }

  const suspiciousIp =
    !clientIp || clientIp === 'unknown' || clientIp.startsWith('0.0.0.0');
  if (suspiciousIp) {
    score += 5;
    reasons.push('ip_not_trusted');
  }

  const threshold = 55;
  return {
    ok: score < threshold,
    score,
    reasons,
  };
}

export async function recordVelocity(prisma, nationalPhone, amountUsdCents) {
  const ph = phoneHash(nationalPhone);
  const hour = utcHourKey();
  await prisma.velocityWindow.upsert({
    where: { phoneHash_windowHour: { phoneHash: ph, windowHour: hour } },
    create: {
      phoneHash: ph,
      windowHour: hour,
      totalCents: amountUsdCents,
      orderCount: 1,
    },
    update: {
      totalCents: { increment: amountUsdCents },
      orderCount: { increment: 1 },
    },
  });
}
