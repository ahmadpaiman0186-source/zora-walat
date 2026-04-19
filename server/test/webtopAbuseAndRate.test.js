/**
 * Web top-up: 5/min IP limiter + abuse guards (failed payments, same-number spam).
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it, beforeEach, afterEach } from 'node:test';

import express from 'express';

import { webtopTopupsPerMinuteLimiter } from '../src/middleware/rateLimits.js';
import {
  __resetWebtopAbuseStoresForTests,
  webtopAbusePreCheck,
  webtopAbuseRecordFailedPayments,
} from '../src/middleware/webtopAbuseProtection.js';

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

function postJson(port, path, body, headers = {}) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'X-Forwarded-For': '203.0.113.9',
          ...headers,
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => {
          chunks += c;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: chunks });
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('webtopTopupsPerMinuteLimiter', () => {
  /** @type {import('http').Server | undefined} */
  let server;
  let port = 0;

  beforeEach(async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post(
      '/api/topup-orders',
      webtopTopupsPerMinuteLimiter,
      (_req, res) => res.json({ ok: true }),
    );
    const s = await listen(app);
    server = s.server;
    port = s.port;
  });

  afterEach(async () => {
    await new Promise((r) => server?.close(r));
  });

  it('returns 429 on the 6th request within one minute (same IP)', async () => {
    for (let i = 0; i < 5; i += 1) {
      const r = await postJson(port, '/api/topup-orders', {});
      assert.equal(r.status, 200);
    }
    const r6 = await postJson(port, '/api/topup-orders', {});
    assert.equal(r6.status, 429);
    const j = JSON.parse(r6.body);
    assert.equal(j.code, 'rate_limited');
  });
});

describe('webtop advanced abuse heuristics', () => {
  beforeEach(() => {
    __resetWebtopAbuseStoresForTests();
    delete process.env.WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW;
    delete process.env.WEBTOPUP_ABUSE_PI_CHURN_MAX_PER_WINDOW;
    delete process.env.WEBTOPUP_ABUSE_MULTI_TARGET_DISTINCT_MAX;
  });

  afterEach(() => {
    delete process.env.WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW;
    delete process.env.WEBTOPUP_ABUSE_PI_CHURN_MAX_PER_WINDOW;
    delete process.env.WEBTOPUP_ABUSE_MULTI_TARGET_DISTINCT_MAX;
  });

  it('blocks abuse_burst_activity after threshold (create-payment-intent)', async () => {
    process.env.WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW = '3';
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post(
      '/create-payment-intent',
      webtopAbusePreCheck,
      (_req, res) => res.json({ ok: true }),
    );
    const { server, port } = await listen(app);
    const xf = { 'X-Forwarded-For': '198.51.100.10' };
    try {
      for (let i = 0; i < 3; i += 1) {
        const r = await postJson(port, '/create-payment-intent', {}, xf);
        assert.equal(r.status, 200);
      }
      const blocked = await postJson(port, '/create-payment-intent', {}, xf);
      assert.equal(blocked.status, 429);
      const j = JSON.parse(blocked.body);
      assert.equal(j.code, 'webtopup_abuse_blocked');
      assert.equal(j.abuseReason, 'abuse_burst_activity');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('blocks abuse_payment_intent_churn separately from burst', async () => {
    process.env.WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW = '500';
    process.env.WEBTOPUP_ABUSE_PI_CHURN_MAX_PER_WINDOW = '2';
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post(
      '/create-payment-intent',
      webtopAbusePreCheck,
      (_req, res) => res.json({ ok: true }),
    );
    const { server, port } = await listen(app);
    const xf = { 'X-Forwarded-For': '198.51.100.11' };
    try {
      for (let i = 0; i < 2; i += 1) {
        const r = await postJson(port, '/create-payment-intent', {}, xf);
        assert.equal(r.status, 200);
      }
      const blocked = await postJson(port, '/create-payment-intent', {}, xf);
      assert.equal(blocked.status, 429);
      const j = JSON.parse(blocked.body);
      assert.equal(j.abuseReason, 'abuse_payment_intent_churn');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('blocks abuse_multi_target_spray', async () => {
    process.env.WEBTOPUP_ABUSE_MULTI_TARGET_DISTINCT_MAX = '3';
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post('/api/topup-orders', webtopAbusePreCheck, (_req, res) => res.json({ ok: true }));
    const { server, port } = await listen(app);
    const xf = { 'X-Forwarded-For': '198.51.100.12' };
    const mkBody = (n) => ({
      phoneNumber: `+9370123456${n}`,
      destinationCountry: 'af',
      operatorKey: 'op',
      originCountry: 'us',
      productType: 'airtime',
      operatorLabel: 'x',
      productId: 'p',
      productName: 'n',
      selectedAmountLabel: 'a',
      amountCents: 500,
      currency: 'usd',
    });
    try {
      for (let i = 0; i < 3; i += 1) {
        const r = await postJson(port, '/api/topup-orders', mkBody(i), xf);
        assert.equal(r.status, 200);
      }
      const blocked = await postJson(port, '/api/topup-orders', mkBody(9), xf);
      assert.equal(blocked.status, 429);
      const j = JSON.parse(blocked.body);
      assert.equal(j.abuseReason, 'abuse_multi_target_spray');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});

describe('webtopAbuseProtection', () => {
  beforeEach(() => {
    __resetWebtopAbuseStoresForTests();
  });

  it('blocks after repeated non-400 payment-path failures (mark-paid)', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post(
      '/api/topup-orders/x/mark-paid',
      webtopAbusePreCheck,
      webtopAbuseRecordFailedPayments,
      (_req, res) => res.status(403).json({ success: false, code: 'test' }),
    );
    const { server, port } = await listen(app);
    try {
      for (let i = 0; i < 8; i += 1) {
        const r = await postJson(port, '/api/topup-orders/x/mark-paid', {}, {
          'X-Forwarded-For': '198.51.100.2',
        });
        assert.equal(r.status, 403);
      }
      const blocked = await postJson(port, '/api/topup-orders/x/mark-paid', {}, {
        'X-Forwarded-For': '198.51.100.2',
      });
      assert.equal(blocked.status, 429);
      const j = JSON.parse(blocked.body);
      assert.equal(j.code, 'webtopup_abuse_blocked');
      assert.equal(j.abuseReason, 'abuse_failed_payment_pattern');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('blocks same-number spam on order create', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post(
      '/api/topup-orders',
      webtopAbusePreCheck,
      (_req, res) => res.json({ ok: true }),
    );
    const { server, port } = await listen(app);
    const body = {
      phoneNumber: '+93701234567',
      destinationCountry: 'af',
    };
    const xf = { 'X-Forwarded-For': '198.51.100.3' };
    try {
      for (let i = 0; i < 10; i += 1) {
        const r = await postJson(port, '/api/topup-orders', body, xf);
        assert.equal(r.status, 200);
      }
      const blocked = await postJson(port, '/api/topup-orders', body, xf);
      assert.equal(blocked.status, 429);
      const j = JSON.parse(blocked.body);
      assert.equal(j.code, 'webtopup_abuse_blocked');
      assert.equal(j.abuseReason, 'abuse_same_target_spam');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
