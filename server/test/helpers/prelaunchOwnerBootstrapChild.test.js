/**
 * Subprocess: PRELAUNCH_LOCKDOWN + OWNER_ALLOWED_EMAIL must be set before env/app import (parent spawns this).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

const OWNER = 'ahmadpaimaiman0186@gmail.com';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('prelaunch + owner-only registration bootstrap (child)', () => {
  it('still blocks arbitrary email registration with 503', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'nobody@example.com', password: 'does-not-matter-12345' });
    assert.equal(res.status, 503);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
  });

  it('allows designated owner email to register when DATABASE_URL is set', async () => {
    const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
    if (!dbUrl) {
      return;
    }
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
    try {
      await prisma.user.deleteMany({ where: { email: OWNER } });
      const reg = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: OWNER, password: 'OwnerPrelaunch123!Owner' });
      assert.equal(reg.status, 201, JSON.stringify(reg.body));
      assert.equal(reg.body?.user?.email, OWNER);
      await prisma.user.deleteMany({ where: { email: OWNER } });
    } finally {
      await prisma.$disconnect();
    }
  });
});
