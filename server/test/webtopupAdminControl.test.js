import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, describe, it } from 'node:test';
import request from 'supertest';

describe('webtopup admin control (ADMIN_SECRET)', () => {
  /** @type {import('express').Express} */
  let app;
  let secret;

  before(async () => {
    const { createApp } = await import('../src/app.js');
    // PrismaClient (via db.js) loads server/.env on first import; rotation keys then override ADMIN_SECRET.
    delete process.env.ADMIN_SECRET_CURRENT;
    delete process.env.ADMIN_SECRET_PREVIOUS;
    process.env.ADMIN_SECRET = 'test_admin_secret_value_32chars_x';
    app = createApp();
    secret = process.env.ADMIN_SECRET;
  });

  it('401 without credentials on GET status', async () => {
    const oid = `tw_ord_${randomUUID()}`;
    const res = await request(app).get('/api/admin/webtopup/status').query({ orderId: oid });
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });

  it('400 when orderId missing on GET status', async () => {
    const res = await request(app)
      .get('/api/admin/webtopup/status')
      .set('Authorization', `Bearer ${secret}`);
    assert.equal(res.status, 400);
  });

  it('404 when order does not exist (valid id format)', async () => {
    const oid = `tw_ord_${randomUUID()}`;
    const res = await request(app)
      .get('/api/admin/webtopup/status')
      .query({ orderId: oid })
      .set('Authorization', `Bearer ${secret}`);
    assert.equal(res.status, 404);
  });

  it('401 without credentials on GET reconciliation', async () => {
    const oid = `tw_ord_${randomUUID()}`;
    const res = await request(app).get('/api/admin/webtopup/reconciliation').query({ orderId: oid });
    assert.equal(res.status, 401);
  });

  it('401 without credentials on GET reconciliation/recent', async () => {
    const res = await request(app).get('/api/admin/webtopup/reconciliation/recent');
    assert.equal(res.status, 401);
  });

  it('401 without credentials on GET provider-health', async () => {
    const res = await request(app).get('/api/admin/webtopup/provider-health');
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });

  it('401 without credentials on GET queue-health', async () => {
    const res = await request(app).get('/api/admin/webtopup/queue-health');
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });

  it('401 without credentials on GET monitoring', async () => {
    const res = await request(app).get('/api/admin/webtopup/monitoring');
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
  });

  it('200 on GET monitoring with auth returns summary shape', async () => {
    const res = await request(app)
      .get('/api/admin/webtopup/monitoring')
      .set('Authorization', `Bearer ${secret}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(['ok', 'warn', 'critical'].includes(res.body.severity));
    assert.ok(Array.isArray(res.body.alerts));
    assert.ok(res.body.metricsSummary);
    assert.ok(res.body.durableLog);
    assert.equal(typeof res.body.durableLog.enabled, 'boolean');
    assert.ok(res.body.queueHealth);
    assert.ok(res.body.reloadlyDurableCircuit);
    assert.ok(res.body.adminSecurity);
    assert.equal(res.body.adminSecurity.auth.mode, 'legacy');
    assert.ok(res.body.abuseProtection);
    assert.ok(res.body.abuseProtection.thresholds?.burst);
    assert.ok(typeof res.body.abuseProtection.blockCounts === 'object');
    assert.ok(res.body.slaPolicy);
    assert.ok(res.body.slaPolicy.thresholds);
    assert.ok(res.body.slaPolicy.aggregate?.breachedApproximateCounts);
    assert.ok(res.body.webtopDeployment);
    assert.equal(res.body.webtopDeployment.schemaVersion, 1);
    assert.ok(['ok', 'warn', 'invalid'].includes(res.body.webtopDeployment.validationStatus));
    assert.ok(res.body.config?.webtopup);
    assert.ok(['ok', 'warn', 'invalid'].includes(res.body.config.webtopup.validationStatus));
    assert.ok(res.body.config.webtopup.flags);
    assert.ok(res.body.config.webtopup.thresholds?.sla);
    assert.ok(res.body.incidentSignals);
    assert.ok(['ok', 'warn', 'critical'].includes(res.body.incidentSignals.severity));
    assert.ok(Array.isArray(res.body.incidentSignals.incidents));
    assert.ok(res.body.incidentRunbook);
    assert.ok(Array.isArray(res.body.incidentRunbook.incidents));
    assert.ok(Array.isArray(res.body.incidentRunbook.suggestedActions));
    assert.ok(res.body.incidentRunbook.diagnosis);
    assert.ok(res.body.webtopDeployment.featureFlags);
    assert.equal(typeof res.body.webtopDeployment.featureFlags.uxPublicFieldsEnabled, 'boolean');
    const snap = JSON.stringify(res.body.webtopDeployment);
    assert.ok(!snap.includes('sk_test'));
    assert.ok(!snap.includes('DATABASE_URL'));
    assert.ok(!snap.includes('ADMIN_SECRET'));
  });

  it('401 on POST retry without auth', async () => {
    const oid = `tw_ord_${randomUUID()}`;
    const res = await request(app)
      .post('/api/admin/webtopup/retry')
      .send({ orderId: oid, force: true });
    assert.equal(res.status, 401);
  });

  it('503 when ADMIN_SECRET too short', async () => {
    const prev = process.env.ADMIN_SECRET;
    const prevCur = process.env.ADMIN_SECRET_CURRENT;
    const prevPrev = process.env.ADMIN_SECRET_PREVIOUS;
    delete process.env.ADMIN_SECRET_CURRENT;
    delete process.env.ADMIN_SECRET_PREVIOUS;
    process.env.ADMIN_SECRET = 'short';
    try {
      const oid = `tw_ord_${randomUUID()}`;
      const res = await request(app)
        .get('/api/admin/webtopup/status')
        .query({ orderId: oid })
        .set('Authorization', 'Bearer short');
      assert.equal(res.status, 503);
      assert.equal(res.body.error, 'admin_unconfigured');
    } finally {
      process.env.ADMIN_SECRET = prev;
      if (prevCur === undefined) delete process.env.ADMIN_SECRET_CURRENT;
      else process.env.ADMIN_SECRET_CURRENT = prevCur;
      if (prevPrev === undefined) delete process.env.ADMIN_SECRET_PREVIOUS;
      else process.env.ADMIN_SECRET_PREVIOUS = prevPrev;
    }
  });
});
