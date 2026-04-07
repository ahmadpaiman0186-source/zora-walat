#!/usr/bin/env node
/**
 * Lightweight DB + webhook-shaped latency probe (not a full load test).
 *
 * Usage (from server/):
 *   node scripts/phase1-scale-sanity.mjs
 *   PHASE1_SCALE_ITERATIONS=500 PHASE1_SCALE_CONCURRENCY=25 node scripts/phase1-scale-sanity.mjs
 *
 * Requires DATABASE_URL. Does not mutate money-path tables.
 */
import '../bootstrap.js';

import { performance } from 'node:perf_hooks';

import { prisma } from '../src/db.js';

const iterations = Math.min(
  5000,
  Math.max(10, parseInt(String(process.env.PHASE1_SCALE_ITERATIONS ?? '120'), 10)),
);
const concurrency = Math.min(
  100,
  Math.max(1, parseInt(String(process.env.PHASE1_SCALE_CONCURRENCY ?? '15'), 10)),
);

async function pingDb() {
  const t0 = performance.now();
  await prisma.$queryRaw`SELECT 1 AS x`;
  return performance.now() - t0;
}

const samples = [];
for (let i = 0; i < iterations; ) {
  const batch = [];
  for (let j = 0; j < concurrency && i < iterations; j += 1, i += 1) {
    batch.push(pingDb());
  }
  const ms = await Promise.all(batch);
  for (const m of ms) samples.push(m);
}

samples.sort((a, b) => a - b);
const p50 = samples[Math.floor(samples.length * 0.5)];
const p95 = samples[Math.floor(samples.length * 0.95)];
const p99 = samples[Math.floor(samples.length * 0.99)];
const sum = samples.reduce((a, b) => a + b, 0);

const report = {
  kind: 'phase1_scale_sanity',
  iterations: samples.length,
  concurrency,
  dbPingMs: {
    min: samples[0],
    max: samples[samples.length - 1],
    mean: sum / samples.length,
    p50,
    p95,
    p99,
  },
  limits: {
    note:
      'Webhook throughput is bounded by Express + Postgres transaction latency + Stripe signature verification.',
    webhookPracticalThroughputHint:
      'Order-of-magnitude: tens of structured webhooks/sec per Node instance before CPU becomes dominant — validate on your SKU with real traces.',
    fulfillmentConcurrency:
      'Fulfillment workers are limited by intentional single-flight claim per order; horizontal scale adds worker processes, not duplicate dispatch per order.',
    recommendation:
      'Run this script from the same network as prod DB; compare p95 before/after indexes.migrations.',
  },
};

console.log(JSON.stringify(report, null, 2));

await prisma.$disconnect();
