/**
 * GET /ready exposes reliability watchdog + operator posture (PostgreSQL required).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { createApp } from '../../src/app.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for readiness watchdog integration test');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('GET /ready — reliability watchdog (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {import('express').Express} */
  let app;

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
    app = createApp();
  });

  after(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('returns operator readiness + severity policy reference', async () => {
    const res = await request(app).get('/ready').expect(200);
    const body = res.body;
    assert.equal(body.status, 'ready');
    const rw = body.reliabilityWatchdog;
    assert.ok(rw && typeof rw === 'object');
    assert.ok(rw.operatorSeverityPolicyReference);
    const di = rw.decisionIntelligence;
    assert.ok(di && typeof di === 'object');
    assert.ok(di.operatorReadiness);
    assert.equal(typeof di.operatorReadiness.posture, 'string');
    assert.ok(Array.isArray(di.operatorReadiness.factors));
    assert.equal(typeof di.operatorReadiness.narrative, 'string');
    assert.ok(typeof di.readinessHint === 'string');
  });
});
