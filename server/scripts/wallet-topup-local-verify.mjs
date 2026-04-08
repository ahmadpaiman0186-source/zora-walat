#!/usr/bin/env node
/**
 * Local E2E: JWT auth + POST /api/wallet/topup (idempotency UUID).
 * API routes: /auth/register, /auth/login (not under /api).
 */
import '../bootstrap.js';

import { randomBytes, randomUUID } from 'node:crypto';

const base = String(
  process.env.BASE_URL?.trim() ||
    process.env.WALLET_VERIFY_BASE_URL?.trim() ||
    'http://127.0.0.1:8787',
).replace(/\/$/, '');

const AMOUNT = Number(process.env.WALLET_VERIFY_AMOUNT_USD ?? '10');
const replay = process.argv.includes('--replay');

async function readResponseBody(res) {
  const raw = await res.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { _raw: raw };
  }
  return { raw, parsed, status: res.status };
}

/** @param {unknown} parsed */
function logResult(label, status, parsed) {
  const line = {
    step: label,
    httpStatus: status,
    body: parsed,
  };
  if (parsed && typeof parsed === 'object' && 'idempotentReplay' in parsed) {
    line.idempotentReplay = parsed.idempotentReplay;
  }
  console.log(JSON.stringify(line, null, 2));
}

async function postJson(path, bodyObj) {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj),
  });
  const { raw, parsed, status } = await readResponseBody(r);
  return { ok: r.ok, status, raw, parsed };
}

async function main() {
  if (!Number.isFinite(AMOUNT) || AMOUNT <= 0) {
    console.error('[verify:wallet] invalid amount');
    process.exit(1);
  }

  const envEmail = String(process.env.WALLET_VERIFY_EMAIL ?? '').trim();
  const envPassword = String(process.env.WALLET_VERIFY_PASSWORD ?? '').trim();
  const email =
    envEmail || `wallet_verify_${randomBytes(8).toString('hex')}@local.test`;
  const password = envPassword || 'WalletLoc01!verify';

  if (password.length < 10) {
    console.error('[verify:wallet] password must be >= 10 chars');
    process.exit(1);
  }

  console.error(`[verify:wallet] BASE_URL=${base} email=${email}`);

  /** @type {{ ok: boolean, parsed: any, raw?: string }} */
  let authOk;

  if (envEmail) {
    let log = await postJson('/auth/login', { email, password });
    logResult('login', log.status, log.parsed);
    if (!log.ok) {
      const reg = await postJson('/auth/register', { email, password });
      logResult('register', reg.status, reg.parsed);
      if (reg.status !== 201) {
        console.error(
          '[verify:wallet] register failed',
          reg.raw?.slice?.(0, 2000) ?? reg.raw,
        );
        process.exit(1);
      }
      log = await postJson('/auth/login', { email, password });
      logResult('login_after_register', log.status, log.parsed);
    }
    authOk = log;
  } else {
    const reg = await postJson('/auth/register', { email, password });
    logResult('register', reg.status, reg.parsed);
    if (reg.status !== 201) {
      console.error(
        '[verify:wallet] register failed',
        reg.raw?.slice?.(0, 2000) ?? reg.raw,
      );
      process.exit(1);
    }
    authOk = await postJson('/auth/login', { email, password });
    logResult('login', authOk.status, authOk.parsed);
  }

  if (!authOk.ok) {
    console.error('[verify:wallet] login failed', authOk.raw?.slice?.(0, 2000) ?? authOk.raw);
    process.exit(1);
  }

  const accessToken = authOk.parsed?.accessToken;
  if (!accessToken || typeof accessToken !== 'string') {
    console.error('[verify:wallet] missing accessToken', authOk.parsed);
    process.exit(1);
  }

  const idem =
    String(process.env.WALLET_VERIFY_IDEMPOTENCY_KEY ?? '').trim() || randomUUID();

  async function doTopup(stepLabel) {
    const r = await fetch(`${base}/api/wallet/topup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idem,
      },
      body: JSON.stringify({ amount: AMOUNT }),
    });
    const { raw, parsed, status } = await readResponseBody(r);
    logResult(stepLabel, status, parsed);
    if (!r.ok) {
      console.error(`[verify:wallet] ${stepLabel} failed`, raw?.slice?.(0, 2000) ?? raw);
      process.exit(1);
    }
    return parsed;
  }

  const first = await doTopup('wallet_topup_first');
  if (first?.idempotentReplay === true) {
    console.error('[verify:wallet] expected first topup idempotentReplay false/omit');
    process.exit(1);
  }

  if (replay) {
    const second = await doTopup('wallet_topup_replay_same_key');
    if (second?.idempotentReplay !== true) {
      console.error('[verify:wallet] expected idempotentReplay: true on replay', second);
      process.exit(1);
    }
  }

  console.error('[verify:wallet] ok');
}

main().catch((e) => {
  console.error('[verify:wallet] error', e);
  process.exit(1);
});
