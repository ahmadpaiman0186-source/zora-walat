#!/usr/bin/env node
/**
 * Authenticated load-style exercise for POST /api/wallet/topup.
 *
 * Modes (explicit argv OR inherited from `npm run load:wallet:replay|apply`):
 *   --mode=replay | --mode replay   — one shared Idempotency-Key (replay safety; not credit throughput)
 *   --mode=apply  | --mode apply    — unique UUID per request (first-apply / real credits per success)
 *
 * Smokes: --smoke-unauthed | --smoke-no-idem
 *
 * Env: BASE_URL | WALLET_VERIFY_BASE_URL, WALLET_LOAD_REQUESTS, WALLET_LOAD_CONCURRENCY,
 *      WALLET_LOAD_AMOUNT, WALLET_VERIFY_EMAIL / WALLET_VERIFY_PASSWORD
 */
import '../bootstrap.js';

import { randomUUID } from 'node:crypto';
import pLimit from 'p-limit';

import { obtainAccessToken } from './lib/wallet-http-auth.mjs';
import {
  assertApplyModeKeys,
  assertReplayModeKeys,
  parseLoadMode,
} from './lib/wallet-load-mode.mjs';
import {
  applyModeDefects,
  classifyWalletTopupResult,
  replayModeDefects,
} from './lib/wallet-load-semantics.mjs';

const base = String(
  process.env.BASE_URL?.trim() ||
    process.env.WALLET_VERIFY_BASE_URL?.trim() ||
    'http://127.0.0.1:8787',
).replace(/\/$/, '');

const amount = Number(process.env.WALLET_LOAD_AMOUNT ?? process.env.WALLET_VERIFY_AMOUNT_USD ?? '10');
const requests = Math.max(1, parseInt(process.env.WALLET_LOAD_REQUESTS ?? '30', 10) || 30);
const concurrency = Math.max(1, parseInt(process.env.WALLET_LOAD_CONCURRENCY ?? '6', 10) || 6);

async function oneTopup(accessToken, idempotencyKey, withAuth) {
  const headers = {
    'Content-Type': 'application/json',
    ...(withAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };
  const r = await fetch(`${base}/api/wallet/topup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount }),
  });
  const raw = await r.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { _raw: raw };
  }
  const kind = classifyWalletTopupResult(r.status, parsed);
  return {
    status: r.status,
    parsed,
    kind: kind.kind,
    idempotentReplay:
      parsed && typeof parsed === 'object' ? parsed.idempotentReplay : undefined,
    rawSnippet: raw.length > 500 ? `${raw.slice(0, 500)}…` : raw,
  };
}

function tally(rows) {
  /** @type {Record<string, number>} */
  const byKind = {};
  /** @type {Record<string, number>} */
  const byStatus = {};
  for (const row of rows) {
    byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
    byStatus[String(row.status)] = (byStatus[String(row.status)] ?? 0) + 1;
  }
  return { byKind, byStatus };
}

async function main() {
  const smokeUnauthed = process.argv.includes('--smoke-unauthed');
  const smokeNoIdem = process.argv.includes('--smoke-no-idem');

  if (smokeUnauthed) {
    console.error('[wallet-load] smoke-unauthed: POST /api/wallet/topup without Authorization');
    const row = await oneTopup('', randomUUID(), false);
    console.log(JSON.stringify({ summary: 'smoke_unauthed', row }, null, 2));
    if (row.kind !== 'auth_required' || row.status !== 401) {
      console.error('[wallet-load] expected 401 auth_required');
      process.exit(1);
    }
    console.error('[wallet-load] ok');
    return;
  }

  if (smokeNoIdem) {
    if (process.env.REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY !== 'true') {
      console.error(
        '[wallet-load] smoke requires REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY=true in server/.env (reload after change)',
      );
      process.exit(1);
    }
    const { accessToken } = await obtainAccessToken(base);
    console.error('[wallet-load] smoke-no-idem: POST with Bearer but no Idempotency-Key');
    const row = await oneTopup(accessToken, null, true);
    console.log(JSON.stringify({ summary: 'smoke_no_idem', row }, null, 2));
    if (row.kind !== 'idempotency_required' || row.status !== 400) {
      console.error('[wallet-load] expected 400 idempotency_required');
      process.exit(1);
    }
    console.error('[wallet-load] ok');
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    console.error('[wallet-load] invalid amount');
    process.exit(1);
  }

  const modeParse = parseLoadMode(process.argv);
  const mode = modeParse.mode;

  if (mode !== 'replay' && mode !== 'apply') {
    console.error('[wallet-load] could not resolve mode=replay|apply');
    console.error(`  parse source: ${modeParse.source}`);
    console.error(`  argv: ${JSON.stringify(process.argv)}`);
    console.error(`  npm_lifecycle_event: ${process.env.npm_lifecycle_event ?? '(unset)'}`);
    console.error(
      '  usage: node scripts/wallet-topup-load.mjs --mode=replay | --mode=apply | --mode apply',
    );
    console.error('  or: npm run load:wallet:replay | npm run load:wallet:apply');
    process.exit(1);
  }

  console.error(
    `[wallet-load] BASE_URL=${base} mode=${mode} (resolved via ${modeParse.source}) requests=${requests} concurrency=${concurrency} amount=${amount}`,
  );

  const t0 = Date.now();
  const { accessToken } = await obtainAccessToken(base);
  const sharedKey = randomUUID();

  /** Build work queue: replay → same key; apply → one UUID per row (fresh call each iteration). */
  const work = [];
  for (let i = 0; i < requests; i++) {
    work.push({
      idem: mode === 'replay' ? sharedKey : randomUUID(),
      i,
    });
  }

  const plannedKeys = work.map((w) => w.idem);
  const keyCheck =
    mode === 'replay'
      ? assertReplayModeKeys(plannedKeys, sharedKey, requests)
      : assertApplyModeKeys(plannedKeys, requests);

  if (!keyCheck.ok) {
    console.error('[wallet-load] FATAL idempotency key plan failed:', keyCheck.reason);
    console.error(
      JSON.stringify(
        {
          mode,
          modeResolution: modeParse,
          idempotencyKeyPlanError: keyCheck.reason,
          sampleKeys: plannedKeys.slice(0, 3),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const limit = pLimit(concurrency);
  const rows = await Promise.all(
    work.map((w) =>
      limit(async () => {
        const row = await oneTopup(accessToken, w.idem, true);
        return { ...row, index: w.i, idempotencyKeySuffix: w.idem.slice(-8) };
      }),
    ),
  );

  const elapsed = Date.now() - t0;
  const classes = rows.map((r) => ({ kind: r.kind }));
  const { byKind, byStatus } = tally(rows);

  /** @type {string[]} */
  let defects = [];
  if (mode === 'replay') {
    defects = replayModeDefects(classes);
  } else {
    defects = applyModeDefects(classes);
  }

  const out = {
    mode,
    modeResolution: modeParse,
    idempotencyKeyPolicy:
      mode === 'replay'
        ? 'single_shared_uuid_all_requests'
        : 'unique_uuid_per_request',
    preflightKeysOk: keyCheck.ok,
    requests,
    concurrency,
    amountUsd: amount,
    durationMs: elapsed,
    expectedSemantics: {
      replay:
        'Exactly one apply_ok (typical), rest replay_ok; not a throughput-of-credit metric.',
      apply:
        'Each 200 with idempotentReplay=false is a distinct first apply (wallet balance rises per success).',
    }[mode],
    byKind,
    byStatus,
    defects,
    sampleFailures: rows.filter((r) => r.status < 200 || r.status >= 300).slice(0, 5),
    sampleSuccess: rows.slice(0, 2).map((r) => ({
      index: r.index,
      status: r.status,
      kind: r.kind,
      idempotentReplay: r.idempotentReplay,
      idempotencyKeySuffix: r.idempotencyKeySuffix,
    })),
  };

  console.log(JSON.stringify(out, null, 2));

  if (defects.length > 0) {
    console.error('[wallet-load] defect flags (review):', defects);
    process.exit(1);
  }

  console.error('[wallet-load] ok');
}

main().catch((e) => {
  console.error('[wallet-load]', e);
  process.exit(1);
});
