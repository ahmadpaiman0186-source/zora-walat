#!/usr/bin/env node
/**
 * Real local **webhook transport + verification** proof (not app-level Phase 1 order linkage).
 *
 * Orchestrates:
 *   1) `stripe listen --forward-to http://127.0.0.1:<PORT>/webhooks/stripe`
 *   2) Parses `whsec_…` from CLI output
 *   3) Starts `node start.js` with STRIPE_WEBHOOK_SECRET set to that value (bootstrap preserves it over .env)
 *   4) `stripe trigger checkout.session.completed`
 *   5) Expects Stripe CLI to show `<-- [200]` on forwarded POSTs (signature OK)
 *
 * Does **not** prove Zora `PaymentCheckout` linkage: CLI fixture sessions omit `metadata.internalCheckoutId`.
 * For that, run `npm run test:integration:sprint5` or a real browser checkout.
 *
 * Usage: from repo `server/`:  node scripts/stripe-local-webhook-transport-proof.mjs
 * Requires: `stripe` on PATH, network for Stripe API, PORT free (default 8787).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = String(process.env.PROOF_PORT ?? process.env.PORT ?? '8787').trim();
const forwardTo = `http://127.0.0.1:${port}/webhooks/stripe`;

let listenProc = null;
let apiProc = null;

function killAll() {
  if (apiProc && !apiProc.killed) {
    try {
      apiProc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  if (listenProc && !listenProc.killed) {
    try {
      listenProc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

process.on('SIGINT', () => {
  killAll();
  process.exit(130);
});

async function waitForHealth(ms = 45000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await delay(250);
  }
  throw new Error(`Timeout waiting for GET /health on port ${port}`);
}

async function main() {
  console.log(
    '=== stripe-local-webhook-transport-proof — Stripe CLI + API + signature verification ===\n',
  );
  console.log(`Forward URL: ${forwardTo}\n`);

  let buf = '';
  let whsec = null;

  listenProc = spawn('stripe', ['listen', '--forward-to', forwardTo], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const onChunk = (chunk) => {
    const s = chunk.toString();
    buf += s;
    process.stdout.write(s);
    if (!whsec) {
      const m = buf.match(/whsec_[A-Za-z0-9]+/);
      if (m) whsec = m[0];
    }
  };
  listenProc.stdout?.on('data', onChunk);
  listenProc.stderr?.on('data', onChunk);

  listenProc.on('error', (err) => {
    console.error('[proof] Failed to spawn `stripe listen`. Is Stripe CLI on PATH?', err.message);
    process.exit(1);
  });

  const whsecDeadline = Date.now() + 60000;
  while (!whsec && Date.now() < whsecDeadline) {
    await delay(100);
  }
  if (!whsec) {
    console.error(
      '[proof] TIMEOUT: could not parse whsec_ from `stripe listen` output within 60s.',
    );
    killAll();
    process.exit(1);
  }

  const whsecTail = whsec.length >= 10 ? whsec.slice(-6) : '';
  console.log(
    `\n[proof] Parsed STRIPE_WEBHOOK_SECRET from stripe listen (len=${whsec.length}, tail=…${whsecTail}). API child will use process_inheritance so bootstrap does not overwrite with server/.env.\n`,
  );

  const apiEnv = {
    ...process.env,
    STRIPE_WEBHOOK_SECRET: whsec,
    /** Must survive bootstrap dotenv override (same as inherited STRIPE_WEBHOOK_SECRET). */
    PORT: port,
  };

  apiProc = spawn(process.execPath, ['start.js'], {
    cwd: serverRoot,
    env: apiEnv,
    stdio: 'inherit',
    shell: false,
  });

  apiProc.on('error', (err) => {
    console.error('[proof] Failed to start API:', err.message);
    killAll();
    process.exit(1);
  });

  await waitForHealth();

  console.log('\n[proof] API healthy. Running: stripe trigger checkout.session.completed\n');

  const trigger = spawn('stripe', ['trigger', 'checkout.session.completed'], {
    stdio: 'inherit',
    env: process.env,
    cwd: serverRoot,
  });

  const triggerCode = await new Promise((resolve) => {
    trigger.on('close', (c) => resolve(c ?? 1));
  });

  if (triggerCode !== 0) {
    console.error(`[proof] stripe trigger exited ${triggerCode}`);
    killAll();
    process.exit(1);
  }

  console.log('\n[proof] Waiting for listen forward lines (up to 20s)…\n');
  await delay(20000);

  const saw200 =
    /<--\s*\[200\]\s*POST\s+http:\/\/127\.0\.0\.1:\d+\/webhooks\/stripe/i.test(
      buf,
    );
  const saw400 =
    /<--\s*\[400\]\s*POST\s+http:\/\/127\.0\.0\.1:\d+\/webhooks\/stripe/i.test(
      buf,
    );

  killAll();
  await delay(500);

  console.log('\n=== Result ===');
  if (saw200) {
    console.log(
      'PASS: Stripe CLI shows HTTP 200 on POST /webhooks/stripe — signature verification succeeded.',
    );
    console.log(
      'NOTE: Fixture checkout.session.completed has no Zora metadata — this is webhook-transport proof only.',
    );
    console.log('For DB linkage proof: npm run test:integration:sprint5');
    process.exit(0);
  }
  if (saw400) {
    console.log(
      'FAIL: Stripe CLI shows HTTP 400 — signature verification failed (secret mismatch or body corruption).',
    );
    process.exit(1);
  }
  console.log(
    'INCONCLUSIVE: Could not find [200] or [400] in captured listen output. Check Stripe CLI window manually.',
  );
  process.exit(2);
}

main().catch((e) => {
  console.error('[proof]', e);
  killAll();
  process.exit(1);
});
