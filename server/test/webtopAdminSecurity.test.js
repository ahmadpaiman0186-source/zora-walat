import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';

import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';

describe('WebTopup admin security hardening', () => {
  /** @type {import('express').Express} */
  let app;
  const primary = 'test_admin_primary_secret_32chars_x';
  const secondary = 'test_admin_second_secret_32chars_y';

  before(async () => {
    const { createApp } = await import('../src/app.js');
    app = createApp();
  });

  /** Restore env for other test files that expect legacy `ADMIN_SECRET` only. */
  after(() => {
    delete process.env.ADMIN_SECRET_CURRENT;
    delete process.env.ADMIN_SECRET_PREVIOUS;
    delete process.env.ADMIN_ALLOWED_IPS;
    delete process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M;
    delete process.env.WEBTOPUP_ADMIN_READ_MAX_PER_15M;
    process.env.ADMIN_SECRET = 'test_admin_secret_value_32chars_x';
  });

  afterEach(() => {
    delete process.env.ADMIN_ALLOWED_IPS;
    delete process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M;
    delete process.env.WEBTOPUP_ADMIN_READ_MAX_PER_15M;
  });

  describe('legacy ADMIN_SECRET', () => {
    beforeEach(() => {
      process.env.ADMIN_SECRET = primary;
      delete process.env.ADMIN_SECRET_CURRENT;
      delete process.env.ADMIN_SECRET_PREVIOUS;
    });

    it('GET monitoring includes adminSecurity snapshot without secrets', async () => {
      const res = await request(app)
        .get('/api/admin/webtopup/monitoring')
        .set('Authorization', `Bearer ${primary}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.adminSecurity);
      assert.ok(res.body.adminSecurity.auth);
      assert.equal(res.body.adminSecurity.auth.mode, 'legacy');
      assert.equal(res.body.adminSecurity.auth.rotationEnabled, false);
      assert.equal(res.body.adminSecurity.ipAllowlist.enabled, false);
      assert.ok(typeof res.body.adminSecurity.rateLimits.webtopupAdminReadMaxPerWindow === 'number');
    });

    it('accepts X-Admin-Secret header', async () => {
      const res = await request(app)
        .get('/api/admin/webtopup/monitoring')
        .set('X-Admin-Secret', primary);
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
    });
  });

  describe('ADMIN_SECRET_CURRENT + ADMIN_SECRET_PREVIOUS rotation', () => {
    beforeEach(() => {
      delete process.env.ADMIN_SECRET;
      process.env.ADMIN_SECRET_CURRENT = primary;
      process.env.ADMIN_SECRET_PREVIOUS = secondary;
    });

    it('accepts primary secret', async () => {
      const res = await request(app)
        .get('/api/admin/webtopup/monitoring')
        .set('Authorization', `Bearer ${primary}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.adminSecurity.auth.mode, 'rotation');
      assert.equal(res.body.adminSecurity.auth.secondarySlotConfigured, true);
    });

    it('accepts previous secret', async () => {
      const res = await request(app)
        .get('/api/admin/webtopup/monitoring')
        .set('Authorization', `Bearer ${secondary}`);
      assert.equal(res.status, 200);
    });
  });

  describe('optional IP allowlist', () => {
    beforeEach(() => {
      process.env.ADMIN_SECRET = primary;
      delete process.env.ADMIN_SECRET_CURRENT;
      delete process.env.ADMIN_SECRET_PREVIOUS;
    });

    it('returns 403 when client IP not in ADMIN_ALLOWED_IPS', async () => {
      process.env.ADMIN_ALLOWED_IPS = '203.0.113.50';
      const res = await request(app)
        .get('/api/admin/webtopup/monitoring')
        .set('Authorization', `Bearer ${primary}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.code, API_CONTRACT_CODE.AUTH_FORBIDDEN);
    });

    it('allows 127.0.0.1 when listed', async () => {
      process.env.ADMIN_ALLOWED_IPS = '127.0.0.1,::1';
      const res = await request(app)
        .get('/api/admin/webtopup/monitoring')
        .set('Authorization', `Bearer ${primary}`);
      assert.equal(res.status, 200);
    });
  });

  describe('admin-specific rate limits', () => {
    beforeEach(() => {
      process.env.ADMIN_SECRET = primary;
      delete process.env.ADMIN_SECRET_CURRENT;
      delete process.env.ADMIN_SECRET_PREVIOUS;
    });

    it('returns 429 after mutation budget exceeded', async () => {
      const prevLc = process.env.npm_lifecycle_event;
      process.env.npm_lifecycle_event = 'test';
      process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M = '1';
      try {
        await request(app)
          .post('/api/admin/webtopup/incident-action')
          .set('Authorization', `Bearer ${primary}`)
          .send({ actionId: 'snapshot_queue_health' });
        const res = await request(app)
          .post('/api/admin/webtopup/incident-action')
          .set('Authorization', `Bearer ${primary}`)
          .send({ actionId: 'snapshot_queue_health' });
        assert.equal(res.status, 429);
        assert.equal(res.body.code, API_CONTRACT_CODE.RATE_LIMITED);
      } finally {
        if (prevLc === undefined) delete process.env.npm_lifecycle_event;
        else process.env.npm_lifecycle_event = prevLc;
      }
    }, { skip: !process.env.DATABASE_URL });

  });
});
