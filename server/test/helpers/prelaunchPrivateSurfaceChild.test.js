/**
 * Loaded only via subprocess from `prelaunchPrivateSurface.test.js` with PRELAUNCH_* env set
 * before any application modules load.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

const { createApp } = await import('../../src/app.js');

const app = createApp();
const OPS = 'ops-token-test-16chars-min';

describe('prelaunch lockdown surfaces (child process)', () => {
  it('GET /ops/health without token returns 503 prelaunch_lockdown', async () => {
    const res = await request(app).get('/ops/health').expect(503);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
  });

  it('GET /ready without token returns 503 prelaunch_lockdown', async () => {
    const res = await request(app).get('/ready').expect(503);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
  });

  it('GET /ops/health with OPS_HEALTH_TOKEN returns detailed payload', async () => {
    const res = await request(app)
      .get('/ops/health')
      .set('X-ZW-Ops-Token', OPS)
      .expect(200);
    assert.equal(res.body?.server, 'ok');
    assert.ok(typeof res.body?.db === 'string');
  });

  it('GET /ready with token returns ready when DB healthy', async () => {
    const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
    if (!dbUrl) {
      return;
    }
    const res = await request(app)
      .get('/ready')
      .set('Authorization', `Bearer ${OPS}`)
      .expect(200);
    assert.equal(res.body?.status, 'ready');
  });

  it('POST /api/auth/register returns 503 when public registration not allowed', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'nobody@example.com', password: 'does-not-matter-123' })
      .expect(503);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
  });

  it('POST /create-payment-intent returns 503 (money path blocked)', async () => {
    const res = await request(app)
      .post('/create-payment-intent')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(503);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
  });

  it('POST /api/topup-orders returns 503 (web top-up tree blocked in prelaunch)', async () => {
    const res = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(503);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
  });

  it('GET /api/auth/me with dev checkout header does not bypass auth', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('X-ZW-Dev-Checkout', 'dev-bypass-secret-16chars-min')
      .expect(401);
    assert.equal(res.body?.code, 'auth_required');
  });
});
