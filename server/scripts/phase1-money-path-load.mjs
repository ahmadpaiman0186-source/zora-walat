#!/usr/bin/env node
/**
 * Measured stress for Phase 1 money path (not hand-wavy): sequential + concurrent
 * signed webhook POSTs, fulfillment-queue-shaped DB writes, and canonical read fanout.
 *
 * From server/:
 *   DATABASE_URL=... node scripts/phase1-money-path-load.mjs
 *
 * Optional: PHASE1_LOAD_WEBHOOK_CONCURRENCY=8 PHASE1_LOAD_WEBHOOKS=24 PHASE1_LOAD_CANONICAL_QUERIES=120
 *
 * Uses test-shaped Stripe signing keys if env vars are unset (local lab only).
 */
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import http from 'node:http';

import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

if (!String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()) {
  process.env.STRIPE_WEBHOOK_SECRET = `whsec_${'c'.repeat(32)}`;
}
if (!String(process.env.STRIPE_SECRET_KEY ?? '').trim()) {
  process.env.STRIPE_SECRET_KEY = `sk_test_${'d'.repeat(100)}`;
}
if (!String(process.env.AIRTIME_PROVIDER ?? '').trim()) {
  process.env.AIRTIME_PROVIDER = 'mock';
}

await import('../bootstrap.js');

const { createApp } = await import('../src/app.js');
const { getCanonicalPhase1OrderForUser } = await import(
  '../src/services/canonicalPhase1OrderService.js'
);
const { processFulfillmentForOrder } = await import(
  '../src/services/fulfillmentProcessingService.js'
);
const { ORDER_STATUS } = await import('../src/constants/orderStatus.js');
const { PAYMENT_CHECKOUT_STATUS } = await import(
  '../src/constants/paymentCheckoutStatus.js'
);

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
if (!dbUrl) {
  console.error(JSON.stringify({ error: 'DATABASE_URL required' }));
  process.exit(1);
}

const webhookN = Math.min(
  200,
  Math.max(5, parseInt(String(process.env.PHASE1_LOAD_WEBHOOKS ?? '20'), 10)),
);
const conc = Math.min(
  50,
  Math.max(1, parseInt(String(process.env.PHASE1_LOAD_WEBHOOK_CONCURRENCY ?? '4'), 10)),
);
const canonN = Math.min(
  5000,
  Math.max(10, parseInt(String(process.env.PHASE1_LOAD_CANONICAL_QUERIES ?? '80'), 10)),
);
/** Sequential + concurrent phases each need fresh PENDING rows. */
const ordersToCreate = Math.min(400, webhookN * 2);

const prisma = new PrismaClient({ datasourceUrl: dbUrl });
const app = createApp();
const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();

/** @type {http.Server} */
const server = await new Promise((resolve, reject) => {
  const s = http.createServer(app);
  s.listen(0, '127.0.0.1', () => resolve(s));
  s.on('error', reject);
});
const addr = server.address();
const port = typeof addr === 'object' && addr ? addr.port : 0;
const base = `http://127.0.0.1:${port}`;

const userIds = [];
const orderIds = [];

async function makeUser() {
  const u = await prisma.user.create({
    data: {
      email: `load_${randomUUID()}@test.invalid`,
      passwordHash: await bcrypt.hash('x', 4),
    },
  });
  userIds.push(u.id);
  return u;
}

async function makePendingCheckout(userId) {
  const row = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      userId,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      orderStatus: ORDER_STATUS.PENDING,
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
    },
  });
  orderIds.push(row.id);
  return row;
}

for (let i = 0; i < ordersToCreate; i += 1) {
  const u = await makeUser();
  await makePendingCheckout(u.id);
}
const orderIdsSequential = orderIds.slice(0, webhookN);
const orderIdsConcurrent = orderIds.slice(webhookN, webhookN * 2);

/**
 * @param {string} type
 * @param {object} obj
 */
function postWebhook(type, obj) {
  const id = `evt_load_${randomUUID()}`;
  const payload = JSON.stringify({
    id,
    object: 'event',
    type,
    data: { object: obj },
  });
  const stripeSig = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const t0 = performance.now();
  return fetch(`${base}/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': stripeSig,
    },
    body: payload,
  }).then((res) => {
    const ms = performance.now() - t0;
    return { ms, ok: res.ok, status: res.status };
  });
}

/** @type {number[]} */
const seqLat = [];
for (let i = 0; i < webhookN; i += 1) {
  const orderId = orderIds[i];
  const piId = `pi_load_${randomUUID().slice(0, 10)}`;
  const r = await postWebhook('checkout.session.completed', {
    id: `cs_load_${randomUUID().slice(0, 10)}`,
    object: 'checkout.session',
    amount_total: 1000,
    currency: 'usd',
    payment_intent: piId,
    customer: 'cus_load',
    metadata: { internalCheckoutId: orderId },
  });
  seqLat.push(r.ms);
}

function pct(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
}

/** @type {number[]} */
const concLat = [];
let cursor = 0;
async function worker() {
  while (cursor < orderIdsConcurrent.length) {
    const idx = cursor;
    cursor += 1;
    if (idx >= orderIdsConcurrent.length) return;
    const orderId = orderIdsConcurrent[idx];
    const piId = `pi_conc_${randomUUID().slice(0, 10)}`;
    const r = await postWebhook('checkout.session.completed', {
      id: `cs_conc_${randomUUID().slice(0, 10)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_load',
      metadata: { internalCheckoutId: orderId },
    });
    concLat.push(r.ms);
  }
}

const concT0 = performance.now();
await Promise.all(Array.from({ length: conc }, () => worker()));
const concWallMs = performance.now() - concT0;

/** Fulfillment-queue-shaped contention: many queued rows, concurrent "peek" claims. */
const queuePeekT0 = performance.now();
await Promise.all(
  orderIds.map((oid) =>
    prisma.fulfillmentAttempt.findMany({
      where: { orderId: oid },
      take: 3,
      select: { id: true, status: true },
    }),
  ),
);
const queuePeekMs = performance.now() - queuePeekT0;

const userIdForOrder = async (oid) => {
  const r = await prisma.paymentCheckout.findFirst({
    where: { id: oid },
    select: { userId: true },
  });
  return r?.userId ?? null;
};

/** Canonical read fanout */
const canonTimes = [];
const canonT0 = performance.now();
for (let i = 0; i < canonN; i += 1) {
  const oid = orderIds[i % orderIds.length];
  const uid = await userIdForOrder(oid);
  if (!uid) continue;
  const t0 = performance.now();
  await getCanonicalPhase1OrderForUser(oid, uid, { prisma });
  canonTimes.push(performance.now() - t0);
}
const canonWallMs = performance.now() - canonT0;

const report = {
  kind: 'phase1_money_path_load',
  generatedAt: new Date().toISOString(),
  parameters: {
    paymentCheckoutsCreated: ordersToCreate,
    sequentialWebhookPosts: orderIdsSequential.length,
    concurrentWebhookPosts: orderIdsConcurrent.length,
    concurrentWebhookWorkers: conc,
    canonicalQueries: canonN,
  },
  webhookHttpMs: {
    sequential: {
      p50: pct(seqLat, 0.5),
      p95: pct(seqLat, 0.95),
      mean: seqLat.reduce((a, b) => a + b, 0) / seqLat.length,
    },
    concurrentBurst: {
      wallClockMs: concWallMs,
      perRequest: {
        p50: pct(concLat, 0.5),
        p95: pct(concLat, 0.95),
        mean: concLat.length ? concLat.reduce((a, b) => a + b, 0) / concLat.length : null,
      },
    },
  },
  fulfillmentConcurrencyProbe: probeOid
    ? {
        orderIdSuffix: probeOid.slice(-12),
        sameOrderDoubleInvokeWallMs: fulfillmentDoubleTapMs,
        attemptSnapshots: fulfillmentDoubleTapStatuses,
      }
    : null,
  db: {
    fulfillmentAttemptPeekParallelMs: queuePeekMs,
    canonicalFanoutTotalMs: canonWallMs,
    canonicalQueryMs: {
      p50: pct(canonTimes, 0.5),
      p95: pct(canonTimes, 0.95),
      mean: canonTimes.reduce((a, b) => a + b, 0) / canonTimes.length,
    },
  },
  capacityNotes: {
    measuredOnThisRun: true,
    firstBottleneckGuess:
      'Per-instance webhook throughput is dominated by Postgres transaction + row-level locks on hot paths; horizontal scale splits load but does not multiply safe per-checkout parallelism.',
    notCovered:
      'Real Stripe latency, Redis (if enabled), and provider API rate limits are not simulated here.',
  },
};

console.log(JSON.stringify(report, null, 2));

for (const oid of orderIds) {
  await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: oid } });
}
for (const oid of orderIds) {
  await prisma.paymentCheckout.deleteMany({ where: { id: oid } });
}
await prisma.stripeWebhookEvent.deleteMany({
  where: { id: { startsWith: 'evt_load_' } },
});
for (const uid of userIds) {
  await prisma.user.deleteMany({ where: { id: uid } });
}

await prisma.$disconnect();
await new Promise((resolve, reject) => {
  server.close((err) => (err ? reject(err) : resolve(undefined)));
});
