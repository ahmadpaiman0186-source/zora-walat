/**
 * Optional JWT binding on web top-up orders: persistence, reads, and list-by-user.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { WEBTOPUP_CLIENT_ERROR_CODE } from '../../src/constants/webtopupClientErrors.js';
import { signAccessToken } from '../../src/services/authTokenService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for web top-up user binding tests');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

const baseTopup = {
  originCountry: 'US',
  destinationCountry: 'AF',
  productType: 'airtime',
  operatorKey: 'mtn_af',
  operatorLabel: 'MTN',
  productId: 'pkg_bind',
  productName: 'Bind test',
  selectedAmountLabel: '$5',
  amountCents: 500,
  currency: 'usd',
};

/** Unique MSISDN per call so hourly same-amount velocity does not block unrelated cases. */
function topupPayload() {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  return {
    ...baseTopup,
    phoneNumber: `7012345${suffix}`.slice(0, 15),
  };
}

describe('web top-up optional user binding (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {import('express').Express} */
  let app;
  /** @type {string[]} */
  const userIds = [];
  /** @type {string[]} */
  const orderIds = [];

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
    app = createApp();
  });

  after(async () => {
    for (const oid of orderIds) {
      await prisma.webTopupOrder.deleteMany({ where: { id: oid } });
    }
    for (const uid of userIds) {
      await prisma.refreshToken.deleteMany({ where: { userId: uid } });
      await prisma.user.deleteMany({ where: { id: uid } });
    }
    await prisma.$disconnect();
  });

  async function makeVerifiedUser() {
    const email = `wt_ub_${randomUUID()}@test.invalid`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('x', 4),
        role: 'user',
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });
    userIds.push(user.id);
    return { user, token: signAccessToken(user) };
  }

  it('anonymous create leaves userId null and session reads still work', async () => {
    const idem = randomUUID();
    const create = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', idem)
      .send(topupPayload());

    assert.equal(create.status, 201);
    const orderId = create.body?.order?.id;
    const sessionKey = create.body?.sessionKey;
    assert.ok(orderId);
    assert.ok(sessionKey);
    orderIds.push(orderId);

    const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
    assert.equal(row?.userId, null);
    assert.equal(create.body?.order?.accountLinked, false);

    const get = await request(app)
      .get(`/api/topup-orders/${encodeURIComponent(orderId)}`)
      .query({ sessionKey });

    assert.equal(get.status, 200);
    assert.equal(get.body?.order?.id, orderId);
    assert.equal(get.body?.order?.accountLinked, false);
  });

  it('authenticated create stores userId and exposes account flags', async () => {
    const { user, token } = await makeVerifiedUser();
    const idem = randomUUID();
    const create = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send(topupPayload());

    assert.equal(create.status, 201);
    const orderId = create.body?.order?.id;
    assert.ok(orderId);
    orderIds.push(orderId);

    const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
    assert.equal(row?.userId, user.id);
    assert.equal(create.body?.order?.accountLinked, true);
    assert.equal(create.body?.order?.viewerIsBoundUser, true);
  });

  it('GET by id without sessionKey succeeds for bound user via JWT recovery', async () => {
    const { user, token } = await makeVerifiedUser();
    const idem = randomUUID();
    const create = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send(topupPayload());

    assert.equal(create.status, 201);
    const orderId = create.body?.order?.id;
    orderIds.push(orderId);

    const get = await request(app)
      .get(`/api/topup-orders/${encodeURIComponent(orderId)}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(get.status, 200);
    assert.equal(get.body?.order?.id, orderId);
    assert.equal(get.body?.order?.viewerIsBoundUser, true);

    const other = await makeVerifiedUser();
    const probe = await request(app)
      .get(`/api/topup-orders/${encodeURIComponent(orderId)}`)
      .set('Authorization', `Bearer ${other.token}`);

    assert.equal(probe.status, 404);
  });

  it('GET list with Authorization and no sessionKey returns bound-user scope', async () => {
    const { token } = await makeVerifiedUser();
    const idem = randomUUID();
    const create = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send(topupPayload());

    assert.equal(create.status, 201);
    orderIds.push(create.body.order.id);

    const list = await request(app)
      .get('/api/topup-orders')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 10 });

    assert.equal(list.status, 200);
    assert.equal(list.body?.listScope, 'bound_user');
    assert.ok(Array.isArray(list.body?.orders));
    assert.ok(
      list.body.orders.some((o) => o.id === create.body.order.id),
      'expected created order in bound-user list',
    );
  });

  it('POST mark-paid rejects body without sessionKey and without Bearer', async () => {
    const res = await request(app)
      .post(
        `/api/topup-orders/tw_ord_${randomUUID()}/mark-paid`,
      )
      .set('Content-Type', 'application/json')
      .send({
        updateToken: 'a'.repeat(64),
        paymentIntentId: 'pi_123456789012345678901234',
      });

    assert.equal(res.status, 400);
    assert.equal(
      res.body?.code,
      WEBTOPUP_CLIENT_ERROR_CODE.MARK_PAID_SESSION_OR_AUTH_REQUIRED,
    );
  });

  it('mark-paid with wrong session returns 404 (no existence leak)', async () => {
    const { user, token } = await makeVerifiedUser();
    const idem = randomUUID();
    const create = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send(topupPayload());

    assert.equal(create.status, 201);
    const orderId = create.body?.order?.id;
    const updateToken = create.body?.updateToken;
    assert.ok(updateToken && updateToken.length >= 32);
    orderIds.push(orderId);

    const res = await request(app)
      .post(`/api/topup-orders/${encodeURIComponent(orderId)}/mark-paid`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send({
        updateToken,
        paymentIntentId: 'pi_123456789012345678901234',
        sessionKey: randomUUID(),
      });

    assert.equal(res.status, 404);
    assert.equal(res.body?.code, WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_NOT_FOUND);
  });

  it('exposes reconciliation block on public order', async () => {
    const idem = randomUUID();
    const create = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', idem)
      .send(topupPayload());

    assert.equal(create.status, 201);
    orderIds.push(create.body.order.id);
    const o = create.body.order;
    assert.ok(o.reconciliation);
    assert.equal(o.reconciliation.orderId, o.id);
    assert.equal(o.reconciliation.paymentStatus, 'pending');
    assert.equal(o.reconciliation.accountLinked, false);
  });
});
