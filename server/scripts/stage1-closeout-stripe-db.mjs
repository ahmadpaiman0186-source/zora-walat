/**
 * One-off Stage 1 closeout: POST /api/create-checkout-session (Stripe test mode) + DB snapshot check.
 * Run: node --import ./test/setupTestEnv.mjs scripts/stage1-closeout-stripe-db.mjs
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/services/authTokenService.js';

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
if (!dbUrl) {
  console.error('[exit 2] DATABASE_URL missing');
  process.exit(2);
}

const prisma = new PrismaClient({ datasourceUrl: dbUrl });
const app = createApp();
const email = `closeout_${randomUUID()}@test.invalid`;
let user;

try {
  user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('x', 4),
      role: 'user',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  const token = signAccessToken(user);
  const idem = randomUUID();
  const res = await request(app)
    .post('/api/create-checkout-session')
    .set('Origin', 'http://localhost:3000')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', idem)
    .set('Content-Type', 'application/json')
    .send({
      currency: 'usd',
      senderCountry: 'US',
      amountUsdCents: 500,
      operatorKey: 'roshan',
      recipientPhone: '0701234567',
    });

  console.log('HTTP', res.status);
  console.log('body sample', {
    orderId: res.body?.orderId,
    urlPresent: Boolean(res.body?.url),
    pricingBreakdown: res.body?.pricingBreakdown,
  });

  const row = await prisma.paymentCheckout.findFirst({
    where: { idempotencyKey: idem },
    select: {
      id: true,
      amountUsdCents: true,
      stripeCheckoutSessionId: true,
      pricingSnapshot: true,
    },
  });
  console.log('DB snapshot keys', row?.pricingSnapshot && typeof row.pricingSnapshot === 'object'
    ? Object.keys(row.pricingSnapshot)
    : row?.pricingSnapshot);
  console.log('policy fields', row?.pricingSnapshot
    ? {
        orchestratorVersion: row.pricingSnapshot.orchestratorVersion,
        taxPolicyVersion: row.pricingSnapshot.taxPolicyVersion,
        feePolicyVersion: row.pricingSnapshot.feePolicyVersion,
        taxSource: row.pricingSnapshot.taxSource,
        snapshotSchemaVersion: row.pricingSnapshot.snapshotSchemaVersion,
      }
    : null);
  console.log('amountUsdCents', row?.amountUsdCents);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  if (user?.id) {
    await prisma.paymentCheckout.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }
  await prisma.$disconnect();
}
