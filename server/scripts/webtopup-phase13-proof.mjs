/**
 * Phase 13: HTTP load + monitoring + incident actions (live API + Postgres).
 *
 * Env: BASE_URL, ADMIN_SECRET, PHASE13_STAGES (default 10,50,100,300), PHASE13_CYCLES (soak).
 * Under PRELAUNCH_LOCKDOWN, GET /ready requires OPS_HEALTH_TOKEN (or OPS_INFRA_HEALTH_TOKEN) as
 * Authorization: Bearer … — use --load-env so the proof picks up server/.env.
 *
 * Flags:
 *   --load-env              Load server/.env for ADMIN_SECRET / BASE_URL.
 *   --monitor-each-stage    GET monitoring after each load stage.
 *   --incident-overlap      Parallel read-only snapshots + last stage only (legacy).
 *   --incident-during-load  Parallel **full** incident sequence (snapshots + recover_stale +
 *                           inspect/reconcile/retry when --order-id or --auto-order) on **every** stage.
 *   --auto-order            POST one canary topup order; use its id for per-order incident steps.
 *   --order-id=tw_ord_…     Explicit order for inspect/reconcile/retry.
 *   --incident-smoke        After each cycle's load, run incident sequence (see --safe-incidents).
 *   --safe-incidents        Skip retry_order_force + force_deliver (recommended with --auto-order).
 *   --monitor-only          No POST /api/topup-orders.
 *   --bootstrap             In-process monitoring only.
 */

import { randomUUID } from 'node:crypto';

const rawArgv = process.argv.slice(2);
const argv = new Set(rawArgv);
const orderIdArg = rawArgv.find((a) => a.startsWith('--order-id='))?.slice('--order-id='.length);

let baseUrl = String(process.env.BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');

/**
 * Match `getAdminSecretCandidates` in adminSecretAuth.js: prefer ADMIN_SECRET_CURRENT when >= 16 chars.
 * Optional: `PHASE13_ADMIN_SECRET` for a one-off proof without editing `.env` (do not commit).
 */
function resolveAdminSecretFromEnv() {
  const p13 = String(process.env.PHASE13_ADMIN_SECRET ?? '').trim();
  if (p13.length >= 16) return p13;
  const cur = String(process.env.ADMIN_SECRET_CURRENT ?? '').trim();
  const leg = String(process.env.ADMIN_SECRET ?? '').trim();
  if (cur.length >= 16) return cur;
  if (leg.length >= 16) return leg;
  return '';
}

let adminSecret = resolveAdminSecretFromEnv();

if (argv.has('--load-env')) {
  await import('../bootstrap.js');
  baseUrl = String(process.env.BASE_URL ?? baseUrl).replace(/\/$/, '');
  adminSecret = resolveAdminSecretFromEnv();
}

const stages = String(process.env.PHASE13_STAGES ?? '10,50,100,300')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0);
const cycles = Math.max(1, parseInt(String(process.env.PHASE13_CYCLES ?? '1'), 10) || 1);

const monitorOnly = argv.has('--monitor-only');
const incidentSmoke = argv.has('--incident-smoke');
const useBootstrap = argv.has('--bootstrap');
const monitorEachStage = argv.has('--monitor-each-stage');
const incidentOverlap = argv.has('--incident-overlap');
const incidentDuringLoad = argv.has('--incident-during-load');
const autoOrder = argv.has('--auto-order');
const safeIncidents = argv.has('--safe-incidents');
/** Staged POST /api/topup-orders + GET /ready only — use when ADMIN_SECRET is not configured (no monitoring/incidents). */
const publicLoadOnly = argv.has('--public-load-only');

const baseTopup = {
  originCountry: 'US',
  destinationCountry: 'AF',
  productType: 'airtime',
  operatorKey: 'mtn_af',
  operatorLabel: 'MTN',
  productId: 'phase13_load',
  productName: 'Phase 13 load',
  selectedAmountLabel: '$5',
  amountCents: 500,
  currency: 'usd',
};

function adminHeaders() {
  if (!adminSecret || adminSecret.length < 16) {
    throw new Error('ADMIN_SECRET (>=16 chars) required for admin endpoints (or use --load-env)');
  }
  return {
    Authorization: `Bearer ${adminSecret}`,
    'Content-Type': 'application/json',
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/** Headers for GET /ready (and /metrics) when PRELAUNCH_LOCKDOWN gates infra surfaces. */
function opsHealthHeadersForInfra() {
  const t = String(process.env.OPS_HEALTH_TOKEN ?? process.env.OPS_INFRA_HEALTH_TOKEN ?? '').trim();
  if (t.length < 16) return {};
  return { Authorization: `Bearer ${t}` };
}

async function fetchReadyJson() {
  const h = opsHealthHeadersForInfra();
  return fetchJson(`${baseUrl}/ready`, Object.keys(h).length ? { headers: h } : {});
}

function prelaunchReadyPreflightNote() {
  const pl = String(process.env.PRELAUNCH_LOCKDOWN ?? '').toLowerCase() === 'true';
  const t = String(process.env.OPS_HEALTH_TOKEN ?? process.env.OPS_INFRA_HEALTH_TOKEN ?? '').trim();
  if (!pl) return null;
  if (t.length >= 16) return null;
  return 'PRELAUNCH_LOCKDOWN=true but OPS_HEALTH_TOKEN missing or <16 chars — unauthenticated GET /ready returns 503 (expected). Use --load-env or set OPS_HEALTH_TOKEN.';
}

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { _nonJson: true, status: r.status, text: text.slice(0, 300) };
  }
  return { ...json, _status: r.status, _ok: r.ok };
}

async function fetchMonitoring() {
  const r = await fetch(`${baseUrl}/api/admin/webtopup/monitoring`, { headers: adminHeaders() });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`monitoring non-JSON ${r.status}: ${text.slice(0, 200)}`);
  }
  if (!r.ok) {
    throw new Error(`monitoring ${r.status}: ${text.slice(0, 300)}`);
  }
  return json;
}

async function postTopupOrder() {
  const idem = randomUUID();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  const body = {
    ...baseTopup,
    phoneNumber: `7012345${suffix}`.slice(0, 15),
  };
  const t0 = Date.now();
  const r = await fetch(`${baseUrl}/api/topup-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idem,
    },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const text = await r.text();
  return { status: r.status, ms, text: text.slice(0, 400) };
}

/** Parse order id from create response JSON. */
function parseOrderIdFromBody(text) {
  try {
    const j = JSON.parse(text);
    const id = j?.order?.id ?? j?.order_id;
    return typeof id === 'string' && id.startsWith('tw_ord_') ? id : null;
  } catch {
    return null;
  }
}

async function createCanaryOrder() {
  const idem = randomUUID();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
  const body = {
    ...baseTopup,
    phoneNumber: `7099912${suffix}`.slice(0, 15),
  };
  const r = await fetch(`${baseUrl}/api/topup-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idem,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  const orderId = parseOrderIdFromBody(text);
  return {
    httpStatus: r.status,
    orderId,
    ok: r.ok && Boolean(orderId),
  };
}

async function runStage(concurrency) {
  const tasks = [];
  for (let i = 0; i < concurrency; i += 1) {
    tasks.push(postTopupOrder());
  }
  const results = await Promise.all(tasks);
  const ok = results.filter((x) => x.status === 201 || x.status === 200).length;
  const rateLimit = results.filter((x) => x.status === 429).length;
  const other = results.length - ok - rateLimit;
  const latencies = results.map((x) => x.ms).sort((a, b) => a - b);
  return {
    concurrency,
    ok,
    rateLimit,
    other,
    latencyMs: {
      min: latencies[0] ?? null,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      max: latencies[latencies.length - 1] ?? null,
    },
  };
}

async function incidentReadOnlySequence() {
  const h = adminHeaders();
  const post = (body) =>
    fetch(`${baseUrl}/api/admin/webtopup/incident-action`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

  const q = await post({ actionId: 'snapshot_queue_health' });
  const p = await post({ actionId: 'snapshot_provider_health' });
  return {
    snapshot_queue_health: q.status,
    snapshot_provider_health: p.status,
  };
}

/**
 * Incident actions intended to run in parallel with load (bounded work).
 * Includes recover_stale_fulfillment_jobs (confirm) and per-order steps when orderId set.
 */
async function incidentDuringLoadSequence(orderId) {
  const h = adminHeaders();
  const post = (body) =>
    fetch(`${baseUrl}/api/admin/webtopup/incident-action`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

  const out = {};
  const q = await post({ actionId: 'snapshot_queue_health' });
  out.snapshot_queue_health = q.status;
  const ph = await post({ actionId: 'snapshot_provider_health' });
  out.snapshot_provider_health = ph.status;

  if (orderId?.trim()) {
    const oid = orderId.trim();
    const ins = await post({ actionId: 'inspect_order', orderId: oid });
    out.inspect_order = ins.status;
    const rec = await post({ actionId: 'reconcile_order', orderId: oid, includeStripe: false });
    out.reconcile_order = rec.status;
    const retry = await post({ actionId: 'retry_order', orderId: oid });
    out.retry_order = retry.status;
  }

  const recoverStale = await post({ actionId: 'recover_stale_fulfillment_jobs', confirm: true });
  out.recover_stale_fulfillment_jobs = recoverStale.status;

  return out;
}

async function incidentSequence(orderId, safe = false) {
  const h = adminHeaders();
  const post = (body) =>
    fetch(`${baseUrl}/api/admin/webtopup/incident-action`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

  await incidentDuringLoadSequence(orderId);

  if (!safe && orderId?.trim()) {
    const oid = orderId.trim();
    const retryF = await post({ actionId: 'retry_order_force', orderId: oid, confirm: true });
    console.error(JSON.stringify({ step: 'retry_order_force', status: retryF.status }));

    const fd = await post({
      actionId: 'force_deliver_order',
      orderId: oid,
      confirm: true,
    });
    console.error(JSON.stringify({ step: 'force_deliver_order', status: fd.status }));
  }
}

async function preflightChecks() {
  const health = await fetchJson(`${baseUrl}/health`);
  const ready = await fetchReadyJson();
  const readyNote = prelaunchReadyPreflightNote();
  let mon = null;
  try {
    mon = await fetchMonitoring();
  } catch (e) {
    mon = { error: String(e?.message ?? e) };
  }
  return {
    health: { status: health._status ?? 'n/a', ok: health._ok },
    ready: {
      status: ready._status ?? 'n/a',
      ok: ready._ok,
      bodyStatus: ready.status,
      ...(readyNote ? { prelaunchNote: readyNote } : {}),
    },
    monitoringOk: mon && !mon.error,
    dbConnections: mon?.dbConnections ?? null,
    memoryHeapUsed: mon?.memoryUsage?.heapUsed ?? null,
    monitoringError: mon?.error ?? null,
  };
}

async function main() {
  if (useBootstrap) {
    await import('../bootstrap.js');
    const { getWebTopupMonitoringSnapshot } = await import('../src/lib/webtopMonitoringSummary.js');
    const snap = await getWebTopupMonitoringSnapshot();
    console.log(JSON.stringify({ source: 'in_process', keys: Object.keys(snap), resource: snap.resourceSnapshot }, null, 2));
    const { prisma } = await import('../src/db.js');
    await prisma.$disconnect().catch(() => {});
    return;
  }

  if (!adminSecret && !publicLoadOnly) {
    console.error(
      'Set ADMIN_SECRET (>=16 chars) in server/.env or pass --load-env. For staged topup-orders only (no admin), use --public-load-only.',
    );
    process.exit(2);
  }

  if (adminSecret) {
    console.log(JSON.stringify({ event: 'preflight_http', ...(await preflightChecks()) }));
  } else {
    const health = await fetchJson(`${baseUrl}/health`);
    const ready = await fetchReadyJson();
    const readyNote = prelaunchReadyPreflightNote();
    console.log(
      JSON.stringify({
        event: 'preflight_http_public_only',
        note: 'ADMIN_SECRET unset — incident actions and GET .../monitoring skipped',
        health: health._status,
        ready: ready._status,
        ...(readyNote ? { prelaunchReadyNote: readyNote } : {}),
      }),
    );
  }

  let effectiveOrderId = String(orderIdArg ?? '').trim();
  if (autoOrder && !effectiveOrderId && !publicLoadOnly) {
    const canary = await createCanaryOrder();
    console.log(JSON.stringify({ event: 'canary_order', ...canary }));
    if (canary.orderId) effectiveOrderId = canary.orderId;
  }

  const useSafeSmoke = safeIncidents || (autoOrder && Boolean(effectiveOrderId));

  const skipAdminIncidents = publicLoadOnly || !adminSecret;

  for (let c = 0; c < cycles; c += 1) {
    console.error(JSON.stringify({ event: 'phase13_cycle', cycle: c + 1, total: cycles }));

    if (!monitorOnly) {
      const lastStage = stages[stages.length - 1];
      for (const n of stages) {
        const t0 = Date.now();
        let out;
        if (!skipAdminIncidents && incidentDuringLoad) {
          const [loadOut, incOut] = await Promise.all([
            runStage(n),
            incidentDuringLoadSequence(effectiveOrderId),
          ]);
          out = { ...loadOut, wallMs: Date.now() - t0, incidentDuringLoad: incOut };
        } else if (!skipAdminIncidents && incidentOverlap && n === lastStage) {
          const [loadOut, incOut] = await Promise.all([runStage(n), incidentReadOnlySequence()]);
          out = { ...loadOut, wallMs: Date.now() - t0, incidentOverlap: incOut };
        } else {
          out = { ...runStage(n), wallMs: Date.now() - t0 };
        }
        console.log(JSON.stringify({ stage: 'topup_orders', cycle: c + 1, ...out }));

        if (monitorEachStage && adminSecret) {
          const mon = await fetchMonitoring();
          console.log(
            JSON.stringify({
              stage: 'monitoring_after_stage',
              cycle: c + 1,
              concurrency: n,
              dbConnections: mon.dbConnections,
              queueDepth: mon.queueDepth,
              incidentSignals: mon.incidentSignals?.severity ?? null,
              metricsSummary: mon.metricsSummary,
              severity: mon.severity,
            }),
          );
        } else if (monitorEachStage && publicLoadOnly) {
          const ready = await fetchJson(`${baseUrl}/ready`);
          console.log(
            JSON.stringify({
              stage: 'ready_after_stage',
              cycle: c + 1,
              concurrency: n,
              httpStatus: ready._status,
              readyBodyStatus: ready.status,
              dbCheck: ready.checks?.database,
            }),
          );
        }
      }
    }

    if (incidentSmoke && !skipAdminIncidents) {
      await incidentSequence(effectiveOrderId, useSafeSmoke);
    }

    if (adminSecret) {
      const mon = await fetchMonitoring();
      console.log(
        JSON.stringify({
          stage: 'monitoring_snapshot',
          cycle: c + 1,
          dbConnections: mon.dbConnections,
          queueDepth: mon.queueDepth,
          workerActivity: mon.workerActivity,
          memoryUsage: mon.memoryUsage,
          severity: mon.severity,
          incidentSignalsSeverity: mon.incidentSignals?.severity,
          incidentCount: mon.incidentSignals?.incidents?.length ?? 0,
          metricsSummary: mon.metricsSummary,
          staleQueuedCount: mon.queueHealth?.orderFulfillment?.staleQueuedCount,
          staleProcessingCount: mon.queueHealth?.orderFulfillment?.staleProcessingCount,
        }),
      );
    } else {
      const ready = await fetchReadyJson();
      console.log(
        JSON.stringify({
          stage: 'ready_snapshot_end_cycle',
          cycle: c + 1,
          httpStatus: ready._status,
          readyBodyStatus: ready.status,
        }),
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
