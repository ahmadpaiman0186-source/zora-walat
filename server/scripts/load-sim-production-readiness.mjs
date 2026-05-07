#!/usr/bin/env node
/**
 * Load / failure simulation harness (staging-friendly).
 *
 * Usage:
 *   LOAD_SIM_BASE_URL=http://127.0.0.1:8787 node scripts/load-sim-production-readiness.mjs
 *
 * Scenarios:
 *   1) 100 concurrent GET /health (throughput + stability)
 *   2) Optional concurrent GET /ready — LOAD_SIM_READY_CONCURRENCY (default 0 = skip; max 50).
 *      If PRELAUNCH_LOCKDOWN=true, set OPS_HEALTH_TOKEN and pass Authorization via env (script adds Bearer).
 *   3) Optional duplicate POST same body (set LOAD_SIM_DUPLICATE_POST_URL + LOAD_SIM_POST_BODY)
 *   4) "Provider burst" = rapid sequential failures to a local echo endpoint (optional)
 *
 * Does not create real Stripe charges. For duplicate Stripe webhooks use integration tests
 * (`npm run proof:stripe-webhook-local` / `stripeWebhookHttpChaos.integration.test.js`).
 */

const base = String(process.env.LOAD_SIM_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const concurrency = Math.min(
  500,
  Math.max(1, parseInt(String(process.env.LOAD_SIM_CONCURRENCY ?? '100'), 10) || 100),
);

async function runConcurrentReady() {
  const raw = parseInt(String(process.env.LOAD_SIM_READY_CONCURRENCY ?? '0'), 10);
  if (!Number.isFinite(raw) || raw < 1) return;
  const readyConcurrency = Math.min(50, raw);
  const url = `${base}/ready`;
  const headers = /** @type {Record<string, string>} */ ({});
  const token = String(process.env.OPS_HEALTH_TOKEN ?? process.env.OPS_INFRA_HEALTH_TOKEN ?? '').trim();
  if (token.length >= 16) {
    headers.authorization = `Bearer ${token}`;
  }
  const t0 = Date.now();
  const tasks = [];
  for (let i = 0; i < readyConcurrency; i += 1) {
    tasks.push(
      fetch(url, { method: 'GET', headers }).then((r) => ({
        ok: r.ok,
        status: r.status,
      })),
    );
  }
  const results = await Promise.all(tasks);
  const ms = Date.now() - t0;
  const oks = results.filter((x) => x.ok).length;
  console.log(
    JSON.stringify({
      loadSim: true,
      scenario: 'concurrent_ready',
      url,
      readyConcurrency,
      ok: oks,
      fail: results.length - oks,
      durationMs: ms,
      rps: Math.round((readyConcurrency / ms) * 1000),
      hadOpsToken: token.length >= 16,
    }),
  );
  if (oks !== readyConcurrency) {
    process.exitCode = 1;
  }
}

async function runConcurrentHealth() {
  const url = `${base}/health`;
  const t0 = Date.now();
  const tasks = [];
  for (let i = 0; i < concurrency; i += 1) {
    tasks.push(
      fetch(url, { method: 'GET' }).then((r) => ({
        ok: r.ok,
        status: r.status,
      })),
    );
  }
  const results = await Promise.all(tasks);
  const ms = Date.now() - t0;
  const oks = results.filter((x) => x.ok).length;
  console.log(
    JSON.stringify({
      loadSim: true,
      scenario: 'concurrent_health',
      url,
      concurrency,
      ok: oks,
      fail: results.length - oks,
      durationMs: ms,
      rps: Math.round((concurrency / ms) * 1000),
    }),
  );
  if (oks !== concurrency) {
    process.exitCode = 1;
  }
}

async function runDuplicatePostIfConfigured() {
  const dupUrl = String(process.env.LOAD_SIM_DUPLICATE_POST_URL ?? '').trim();
  if (!dupUrl) return;
  const body = String(process.env.LOAD_SIM_POST_BODY ?? '{}');
  const headers = {
    'content-type': 'application/json',
    'x-load-sim': '1',
  };
  const t0 = Date.now();
  const [a, b] = await Promise.all([
    fetch(dupUrl, { method: 'POST', headers, body }),
    fetch(dupUrl, { method: 'POST', headers, body }),
  ]);
  console.log(
    JSON.stringify({
      loadSim: true,
      scenario: 'duplicate_post',
      url: dupUrl,
      statusA: a.status,
      statusB: b.status,
      durationMs: Date.now() - t0,
    }),
  );
}

async function runProviderBurstEcho() {
  const burst = parseInt(String(process.env.LOAD_SIM_PROVIDER_BURST ?? '0'), 10);
  if (!Number.isFinite(burst) || burst < 1) return;
  const url = `${base}/health`;
  const t0 = Date.now();
  let fails = 0;
  for (let i = 0; i < burst; i += 1) {
    try {
      const r = await fetch(url, { method: 'GET' });
      if (!r.ok) fails += 1;
    } catch {
      fails += 1;
    }
  }
  console.log(
    JSON.stringify({
      loadSim: true,
      scenario: 'provider_failure_burst_proxy',
      note: 'Rapid sequential requests to /health as stand-in for provider burst tolerance',
      burst,
      fails,
      durationMs: Date.now() - t0,
    }),
  );
}

await runConcurrentHealth();
await runConcurrentReady();
await runDuplicatePostIfConfigured();
await runProviderBurstEcho();
