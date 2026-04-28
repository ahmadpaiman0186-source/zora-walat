/**
 * Reconciliation taxonomy: INCONSISTENT_ATTEMPT_VS_ORDER (PostgreSQL).
 * Requires preloadTestDatabaseUrl (see npm run test:integration).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import bcrypt from 'bcrypt';

import { prisma } from '../../src/db.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../src/constants/fulfillmentAttemptStatus.js';
import {
  runPhase1MoneyFulfillmentReconciliationScan,
  RECON_DIVERGENCE_CODE,
  RECON_V2_ACTION,
} from '../../src/services/phase1MoneyFulfillmentReconciliationEngine.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL');
}

const runIntegration = Boolean(String(process.env.DATABASE_URL ?? '').trim());

describe('money path recon inconsistent (integration)', { skip: !runIntegration }, () => {
  const userIds = [];
  const orderIds = [];

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    for (const oid of orderIds) {
      await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: oid } });
    }
    for (const oid of orderIds) {
      await prisma.paymentCheckout.deleteMany({ where: { id: oid } });
    }
    for (const uid of userIds) {
      await prisma.user.deleteMany({ where: { id: uid } });
    }
    userIds.length = 0;
    orderIds.length = 0;
  });

  it('flags FULFILLED + latest attempt not SUCCEEDED as INCONSISTENT_ATTEMPT_VS_ORDER', async () => {
    const u = await prisma.user.create({
      data: {
        email: `recon_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });
    userIds.push(u.id);

    const row = await prisma.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId: u.id,
        status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
        orderStatus: ORDER_STATUS.FULFILLED,
        amountUsdCents: 1000,
        currency: 'usd',
        senderCountryCode: 'US',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        productType: 'mobile_topup',
        providerCostUsdCents: 800,
        stripeFeeEstimateUsdCents: 59,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
        projectedNetMarginBp: 400,
        paidAt: new Date(),
        stripePaymentIntentId: 'pi_recon_inc',
      },
    });
    orderIds.push(row.id);

    await prisma.fulfillmentAttempt.create({
      data: {
        orderId: row.id,
        attemptNumber: 1,
        status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
        provider: 'mock',
        requestSummary: JSON.stringify({ phase: 'test' }),
      },
    });

    const recon = await runPhase1MoneyFulfillmentReconciliationScan({ limit: 200 });
    const hit = recon.findings.filter(
      (f) =>
        f.checkoutId === row.id &&
        f.divergenceCode === RECON_DIVERGENCE_CODE.INCONSISTENT_ATTEMPT_VS_ORDER,
    );
    assert.equal(hit.length >= 1, true);
    assert.equal(hit[0].actionV2, RECON_V2_ACTION.BLOCKED_UNTIL_CONFIRMATION);
    assert.match(hit[0].explain, /INCONSISTENT_ATTEMPT_VS_ORDER/);
  });
});
