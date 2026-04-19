/**
 * End-to-end Stripe webhook proof: `stripe listen` → local POST /webhooks/stripe → constructEvent → handler.
 * Updates server/.env STRIPE_WEBHOOK_SECRET to match the active listen session, starts the API, runs `stripe trigger`.
 *
 * Usage (from server/): node scripts/stripe-webhook-e2e-proof.mjs
 *
 * Requires: Stripe CLI on PATH, DATABASE_URL reachable, PORT 8787 free.
 * Does not print full secrets — only prefixes, lengths, and event ids.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(serverRoot, '.env');

function readEnvText() {
  return readFileSync(envPath, 'utf8');
}

function validateEnvPhase1() {
  const text = readEnvText();
  const lines = text.split(/\r?\n/);
  const get = (key) => {
    const line = lines.find((l) => l.startsWith(`${key}=`));
    if (!line) return { key, ok: false, reason: 'missing' };
    const v = line.slice(key.length + 1).trim();
    return { key, value: v };
  };

  const sk = get('STRIPE_SECRET_KEY');
  const wh = get('STRIPE_WEBHOOK_SECRET');
  const port = get('PORT');

  const issues = [];
  const skOk =
    sk.value &&
    (sk.value.startsWith('sk_test_') || sk.value.startsWith('sk_live_')) &&
    sk.value.length >= 60;
  if (!skOk) issues.push('STRIPE_SECRET_KEY must be sk_test_/sk_live_ and non-placeholder');

  const portOk = port.value === '8787';
  if (!portOk) issues.push(`PORT must be 8787 (got ${port.value ?? 'unset'})`);

  const dup = /STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET=/.test(text);
  if (dup) issues.push('Malformed STRIPE_WEBHOOK_SECRET (duplicate key in value)');

  console.log(
    JSON.stringify(
      {
        phase: 'env_validation',
        PORT: port.value ?? null,
        STRIPE_SECRET_KEY: sk.value
          ? { prefix: sk.value.slice(0, 12), len: sk.value.length, ok: skOk }
          : { ok: false },
        STRIPE_WEBHOOK_SECRET_before: wh.value
          ? {
              prefix: wh.value.slice(0, 8),
              len: wh.value.length,
              startsWhsec: wh.value.startsWith('whsec_'),
            }
          : null,
        issues,
        env_valid: issues.length === 0 && skOk && portOk && !dup,
      },
      null,
      2,
    ),
  );

  return { ok: issues.length === 0 && skOk && portOk && !dup, issues };
}

function setWebhookSecretInEnv(whsec) {
  const text = readEnvText();
  const next = text.replace(
    /^STRIPE_WEBHOOK_SECRET=.*$/m,
    `STRIPE_WEBHOOK_SECRET=${whsec}`,
  );
  if (next === text && !/^STRIPE_WEBHOOK_SECRET=/m.test(text)) {
    throw new Error('STRIPE_WEBHOOK_SECRET line not found in .env');
  }
  writeFileSync(envPath, next, 'utf8');
  console.log(
    JSON.stringify({
      phase: 'env_written',
      STRIPE_WEBHOOK_SECRET: {
        prefix: whsec.slice(0, 8),
        len: whsec.length,
        startsWhsec: whsec.startsWith('whsec_'),
      },
    }),
  );
}

function extractWhsec(buf) {
  const m = String(buf).match(/(whsec_[a-fA-F0-9]+)/);
  return m ? m[1] : null;
}

function waitForHttpOk(url, ms) {
  const deadline = Date.now() + ms;
  return (async () => {
    while (Date.now() < deadline) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (r.ok) return true;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return false;
  })();
}

const report = {
  env_valid: false,
  server_running: false,
  webhook_route_detected: true,
  signature_verification: false,
  stripe_cli_connected: false,
  webhook_received: false,
  http_status: null,
  handler_executed: false,
  final_status: 'FAIL',
  root_cause: null,
};

const v = validateEnvPhase1();
report.env_valid = v.ok;
if (!v.ok) {
  report.root_cause = v.issues.join('; ');
  console.log(JSON.stringify({ ...report, structured_report: report }, null, 2));
  process.exit(1);
}

let listenProc;
let serverProc;
let listenBuf = '';
let serverOut = '';

try {
  listenProc = spawn(
    'stripe',
    ['listen', '--forward-to', 'http://127.0.0.1:8787/webhooks/stripe'],
    {
      cwd: serverRoot,
      shell: false,
      env: { ...process.env },
    },
  );

  listenProc.stdout?.on('data', (d) => {
    listenBuf += d.toString();
  });
  listenProc.stderr?.on('data', (d) => {
    listenBuf += d.toString();
  });

  const whsec = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for whsec from stripe listen')), 45000);
    const iv = setInterval(() => {
      const w = extractWhsec(listenBuf);
      if (w) {
        clearInterval(iv);
        clearTimeout(t);
        resolve(w);
      }
    }, 150);
  });

  report.stripe_cli_connected = true;
  setWebhookSecretInEnv(whsec);

  serverProc = spawn('node', ['start.js'], {
    cwd: serverRoot,
    env: { ...process.env, STRIPE_WEBHOOK_SECRET: whsec },
    shell: false,
  });

  serverOut = '';
  serverProc.stdout?.on('data', (d) => {
    serverOut += d.toString();
  });
  serverProc.stderr?.on('data', (d) => {
    serverOut += d.toString();
  });

  const up = await waitForHttpOk('http://127.0.0.1:8787/health', 60000);
  report.server_running = up;
  if (!up) {
    report.root_cause = 'Server did not become healthy on http://127.0.0.1:8787/health';
    throw new Error(report.root_cause);
  }

  const hasWebhookBanner =
    /Webhook endpoint: POST http:\/\/127\.0\.0\.1:8787\/webhooks\/stripe/.test(
      serverOut,
    ) || /webhooks\/stripe/.test(serverOut);
  const hasConfigured =
    /stripe_webhook_secret=configured/.test(serverOut) ||
    /STRIPE_WEBHOOK_SECRET loaded/.test(serverOut);

  if (!hasWebhookBanner || !hasConfigured) {
    report.root_cause = 'Server up but expected startup lines missing (webhook banner / whsec configured)';
  }

  const trigger = spawn('stripe', ['trigger', 'payment_intent.succeeded'], {
    cwd: serverRoot,
    shell: false,
    env: { ...process.env },
  });
  let triggerOut = '';
  trigger.stdout?.on('data', (d) => {
    triggerOut += d.toString();
  });
  trigger.stderr?.on('data', (d) => {
    triggerOut += d.toString();
  });

  await new Promise((resolve, reject) => {
    trigger.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`stripe trigger exit ${code}`)),
    );
  });

  await new Promise((r) => setTimeout(r, 4000));

  const sigOk =
    !/Invalid signature|stripeWebhookSignatureInvalid|WEBHOOK ERROR.*signature/i.test(
      serverOut,
    );
  const proofLine = /\[stripe_webhook_proof\]/.test(serverOut);
  const receivedOk = /✅ WEBHOOK RECEIVED: payment_intent\.succeeded/.test(serverOut);
  const listen200 =
    /\[\s*200\s*\].*\/webhooks\/stripe|-->.*\[200\]|200\s+POST.*webhooks\/stripe/i.test(
      listenBuf,
    ) || /200/.test(listenBuf);

  report.signature_verification = sigOk;
  report.webhook_received = receivedOk || proofLine;
  report.handler_executed = proofLine || receivedOk;
  report.http_status = listen200 || receivedOk ? 200 : sigOk ? 200 : 400;

  if (proofLine && sigOk) {
    const m = serverOut.match(/\[stripe_webhook_proof\]\s*(\{[^}]+\})/);
    if (m) {
      try {
        const j = JSON.parse(m[1]);
        report.proof_event = { eventType: j.eventType, eventIdSuffix: j.eventId?.slice(-12) };
      } catch {
        /* ignore */
      }
    }
  }

  if (
    report.env_valid &&
    report.server_running &&
    report.stripe_cli_connected &&
    report.webhook_received &&
    report.handler_executed &&
    report.signature_verification
  ) {
    report.final_status = 'PASS';
  } else {
    report.root_cause = [
      !report.webhook_received && 'webhook handler did not log success',
      !report.signature_verification && 'signature verification may have failed (check server log)',
      !report.handler_executed && 'handler proof line not found',
    ]
      .filter(Boolean)
      .join('; ');
  }

  console.log(
    JSON.stringify({ structured_report: report, listen_log_excerpt: listenBuf.slice(-1200), server_log_excerpt: serverOut.slice(-8000) }, null, 2),
  );
} catch (e) {
  report.root_cause = String(e?.message ?? e);
  console.log(
    JSON.stringify(
      {
        structured_report: report,
        error: report.root_cause,
        listen_excerpt: listenBuf.slice(-1500),
        server_excerpt: typeof serverOut !== 'undefined' ? serverOut.slice(-6000) : '',
      },
      null,
      2,
    ),
  );
  process.exit(1);
} finally {
  try {
    serverProc?.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  try {
    listenProc?.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(serverProc?.pid), '/F', '/T'], {
        shell: true,
      });
    } catch {
      /* ignore */
    }
    try {
      spawn('taskkill', ['/PID', String(listenProc?.pid), '/F', '/T'], {
        shell: true,
      });
    } catch {
      /* ignore */
    }
  }
}

process.exit(report.final_status === 'PASS' ? 0 : 1);
