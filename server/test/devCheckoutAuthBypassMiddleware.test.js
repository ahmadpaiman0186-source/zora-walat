/**
 * Exercises {@link requireAuth} dev header path (same middleware chain as
 * `POST /create-checkout-session`).
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import request from 'supertest';

import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db.js';

const app = createApp();

const origPrelaunch = env.prelaunchLockdown;
const origOwner = env.ownerAllowedEmail;

let saved = {};

beforeEach(() => {
  env.prelaunchLockdown = false;
  env.ownerAllowedEmail = '';
  saved = {
    NODE_ENV: process.env.NODE_ENV,
    DEV_CHECKOUT_AUTH_BYPASS: process.env.DEV_CHECKOUT_AUTH_BYPASS,
    DEV_CHECKOUT_BYPASS_SECRET: process.env.DEV_CHECKOUT_BYPASS_SECRET,
    DEV_CHECKOUT_BYPASS_USER_ID: process.env.DEV_CHECKOUT_BYPASS_USER_ID,
  };
});

afterEach(() => {
  env.prelaunchLockdown = origPrelaunch;
  env.ownerAllowedEmail = origOwner;
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test('NODE_ENV=test: dev header never authenticates', async () => {
  process.env.NODE_ENV = 'test';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'any';

  const res = await request(app)
    .get('/api/auth/me')
    .set('X-ZW-Dev-Checkout', '01234567890123456');

  assert.equal(res.status, 401);
  assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
});

test('NODE_ENV=development, gate off: missing header → auth_required', async () => {
  process.env.NODE_ENV = 'development';
  delete process.env.DEV_CHECKOUT_AUTH_BYPASS;

  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
});

test('NODE_ENV=development, gate on, wrong header secret → auth_required', async (t) => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  const u = await prisma.user.findFirst({ select: { id: true } });
  if (!u) {
    t.skip('requires at least one User row in the configured database');
    return;
  }
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = u.id;

  const res = await request(app)
    .get('/api/auth/me')
    .set('X-ZW-Dev-Checkout', 'wrongwrongwrongwrong');

  assert.equal(res.status, 401);
  assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
});

test('NODE_ENV=development, gate on, correct header → 200 and user matches DEV_CHECKOUT_BYPASS_USER_ID', async (t) => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  const secret = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = secret;
  const u = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!u) {
    t.skip('requires at least one User row in the configured database');
    return;
  }
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = u.id;

  const res = await request(app)
    .get('/api/auth/me')
    .set('X-ZW-Dev-Checkout', secret);

  assert.equal(res.status, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.user?.id, u.id);
  assert.equal(res.body?.user?.email, u.email);
});

test('owner-only mode: dev bypass branch is not entered → auth_required', async (t) => {
  const u = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!u) {
    t.skip('requires at least one User row in the configured database');
    return;
  }
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = u.id;
  env.ownerAllowedEmail = 'someone-else@example.test';

  const res = await request(app)
    .get('/api/auth/me')
    .set('X-ZW-Dev-Checkout', '01234567890123456');

  assert.equal(res.status, 401);
  assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
});
