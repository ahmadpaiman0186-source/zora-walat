#!/usr/bin/env node
/**
 * Zora-Walat super-system diagnostic — no secret values printed.
 * Run from repo: npm --prefix server run doctor:super-system
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const repoRoot = join(serverRoot, '..');
const PORT = 8787;
const HOST = '127.0.0.1';

/** @typedef {{ code: string, severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW', status: 'PASS'|'FAIL'|'WARN', message: string, repair?: string, file?: string }} Row */

/** @type {Row[]} */
const rows = [];

function row(r) {
  rows.push(r);
}

function maskStripeKey(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { present: false, hint: 'missing' };
  const prefix = s.slice(0, 7);
  return { present: true, hint: `${prefix}… (len ${s.length})` };
}

function maskWebhook(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { present: false, hint: 'missing' };
  return { present: true, hint: `prefix ${s.slice(0, 6)}… (len ${s.length})` };
}

function portInUse(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function httpJson(method, url, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { _raw: text.slice(0, 200) };
    }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message ?? e) };
  } finally {
    clearTimeout(t);
  }
}

// --- Node version
const major = Number(process.versions.node.split('.')[0]);
if (Number.isFinite(major) && major >= 20) {
  row({
    code: 'NODE_VERSION',
    severity: 'LOW',
    status: 'PASS',
    message: `Node ${process.version} (>=20)`,
    file: 'server/package.json engines',
  });
} else {
  row({
    code: 'NODE_VERSION',
    severity: 'HIGH',
    status: 'FAIL',
    message: `Node ${process.version} — require >=20`,
    repair: 'Install Node 20 LTS+',
    file: 'server/package.json',
  });
}

// --- npm install state
const nm = join(serverRoot, 'node_modules');
if (existsSync(nm)) {
  row({
    code: 'NPM_INSTALL',
    severity: 'LOW',
    status: 'PASS',
    message: 'server/node_modules present',
    file: serverRoot,
  });
} else {
  row({
    code: 'NPM_INSTALL',
    severity: 'CRITICAL',
    status: 'FAIL',
    message: 'server/node_modules missing',
    repair: 'Run: cd server && npm ci',
    file: join(serverRoot, 'node_modules'),
  });
}

// --- Entrypoints
const startJs = join(serverRoot, 'start.js');
const appJs = join(serverRoot, 'src', 'app.js');
const idx = join(serverRoot, 'src', 'index.js');
for (const [p, label] of [
  [startJs, 'start.js'],
  [appJs, 'src/app.js'],
  [idx, 'src/index.js'],
]) {
  if (existsSync(p)) {
    row({
      code: `ENTRY_${label.replace(/[^a-z0-9]/gi, '_')}`,
      severity: 'MEDIUM',
      status: 'PASS',
      message: `${label} exists`,
      file: p,
    });
  } else {
    row({
      code: 'ENTRY_MISSING',
      severity: 'CRITICAL',
      status: 'FAIL',
      message: `Missing ${label}`,
      repair: 'Restore server sources from git',
      file: p,
    });
  }
}

// --- Port 8787
const listening = await portInUse(HOST, PORT);
if (listening) {
  row({
    code: 'PORT_8787',
    severity: 'MEDIUM',
    status: 'WARN',
    message: `Something accepts TCP on ${HOST}:${PORT} (server may already be running)`,
    repair: 'If unintended, stop the process using the port before starting another API',
  });
} else {
  row({
    code: 'PORT_8787',
    severity: 'LOW',
    status: 'PASS',
    message: `Port ${PORT} not accepting connections (available to start server)`,
  });
}

// --- Stale node processes (best-effort, Windows-friendly)
try {
  if (process.platform === 'win32') {
    const out = execFileSync(
      'tasklist',
      ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV', '/NH'],
      { encoding: 'utf8', windowsHide: true },
    );
    const lines = out.split(/\r?\n/).filter(Boolean);
    const count = lines.length;
    if (count > 6) {
      row({
        code: 'NODE_PROCESSES',
        severity: 'LOW',
        status: 'WARN',
        message: `Many node.exe processes (${count}+ lines from tasklist) — possible stale dev servers`,
        repair: 'Close unused terminals; avoid duplicate `npm start` / `stripe listen` stacks',
      });
    } else {
      row({
        code: 'NODE_PROCESSES',
        severity: 'LOW',
        status: 'PASS',
        message: 'Node process count looks normal (heuristic)',
      });
    }
  } else {
    row({
      code: 'NODE_PROCESSES',
      severity: 'LOW',
      status: 'WARN',
      message: 'Stale process check skipped (non-Windows); use `ps` / Activity Monitor manually',
    });
  }
} catch {
  row({
    code: 'NODE_PROCESSES',
    severity: 'LOW',
    status: 'WARN',
    message: 'Could not enumerate node processes',
  });
}

// --- Load env for presence checks only (bootstrap loads server/.env)
let skMeta = { present: false, hint: 'not loaded' };
let whMeta = { present: false, hint: 'not loaded' };
try {
  await import('../bootstrap.js');
  skMeta = maskStripeKey(process.env.STRIPE_SECRET_KEY);
  whMeta = maskWebhook(process.env.STRIPE_WEBHOOK_SECRET);
} catch (e) {
  row({
    code: 'BOOTSTRAP',
    severity: 'MEDIUM',
    status: 'WARN',
    message: `bootstrap load for env probe: ${String(e.message ?? e)}`,
    file: 'server/bootstrap.js',
  });
}

if (skMeta.present) {
  row({
    code: 'STRIPE_SECRET_KEY',
    severity: 'MEDIUM',
    status: 'PASS',
    message: `STRIPE_SECRET_KEY set (${skMeta.hint})`,
    file: 'process.env',
  });
} else {
  row({
    code: 'STRIPE_SECRET_KEY',
    severity: 'HIGH',
    status: 'WARN',
    message: 'STRIPE_SECRET_KEY missing — payment paths will 503',
    repair: 'Set in server/.env (never commit)',
    file: 'server/.env',
  });
}

if (whMeta.present) {
  row({
    code: 'STRIPE_WEBHOOK_SECRET',
    severity: 'MEDIUM',
    status: 'PASS',
    message: `STRIPE_WEBHOOK_SECRET set (${whMeta.hint})`,
  });
} else {
  row({
    code: 'STRIPE_WEBHOOK_SECRET',
    severity: 'HIGH',
    status: 'WARN',
    message: 'STRIPE_WEBHOOK_SECRET missing — webhook verification cannot run',
    repair: 'Add whsec_ from `stripe listen` to server/.env',
  });
}

// --- Duplicate stripe listen (heuristic): warn if multiple terminals doc
row({
  code: 'STRIPE_LISTEN_DUP',
  severity: 'LOW',
  status: 'WARN',
  message:
    'Ensure only one active `stripe listen` forwards to this server; mismatching whsec causes silent webhook failures',
  repair: 'Restart Node after changing STRIPE_WEBHOOK_SECRET',
});

// --- Database
const dbProbe = spawnSync(
  process.execPath,
  [join(serverRoot, 'scripts', 'test-db-connection.mjs')],
  {
    cwd: serverRoot,
    encoding: 'utf8',
    timeout: 20000,
    env: process.env,
  },
);
if (dbProbe.status === 0) {
  row({
    code: 'DATABASE',
    severity: 'HIGH',
    status: 'PASS',
    message: 'Prisma DB reachable (test-db-connection.mjs)',
    file: 'server/scripts/test-db-connection.mjs',
  });
} else {
  row({
    code: 'DATABASE',
    severity: 'CRITICAL',
    status: 'FAIL',
    message: `Database unreachable: ${(dbProbe.stderr || dbProbe.stdout || '').slice(0, 200)}`,
    repair: 'Check DATABASE_URL, Postgres up, migrations',
    file: 'server/prisma',
  });
}

// --- Static: ladder + restricted policy files
const ladderPath = join(serverRoot, 'src', 'lib', 'phase1PriceLadder.js');
const policyPath = join(serverRoot, 'src', 'policy', 'restrictedRegions.js');
for (const [p, code] of [
  [ladderPath, 'PHASE1_LADDER_FILE'],
  [policyPath, 'RESTRICTED_POLICY_FILE'],
]) {
  if (existsSync(p)) {
    row({
      code,
      severity: 'MEDIUM',
      status: 'PASS',
      message: `Present: ${p.replace(repoRoot + '\\', '').replace(repoRoot + '/', '')}`,
      file: p,
    });
  } else {
    row({
      code,
      severity: 'CRITICAL',
      status: 'FAIL',
      message: `Missing file ${p}`,
      repair: 'Restore from git',
      file: p,
    });
  }
}

// --- HTTP checks if server listening
const base = `http://${HOST}:${PORT}`;
if (listening) {
  const h = await httpJson('GET', `${base}/health`, null);
  if (h.status >= 200 && h.status < 300) {
    row({
      code: 'HTTP_HEALTH',
      severity: 'HIGH',
      status: 'PASS',
      message: `GET /health → ${h.status}`,
    });
  } else {
    row({
      code: 'HTTP_HEALTH',
      severity: 'HIGH',
      status: 'FAIL',
      message: `GET /health failed status=${h.status} ${h.error ?? ''}`,
      repair: 'Inspect server logs; verify correct process on 8787',
    });
  }

  const validQuote = {
    currency: 'usd',
    senderCountry: 'US',
    amountUsdCents: 200,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  };
  const q = await httpJson('POST', `${base}/api/checkout-pricing-quote`, validQuote);
  if (q.status === 200 && q.json?.pricingBreakdown != null) {
    row({
      code: 'PRICING_QUOTE_OK',
      severity: 'HIGH',
      status: 'PASS',
      message: 'POST /api/checkout-pricing-quote valid ladder amount → 200 + pricingBreakdown',
    });
  } else {
    row({
      code: 'PRICING_QUOTE_OK',
      severity: 'HIGH',
      status: 'FAIL',
      message: `Pricing quote failed status=${q.status} body=${JSON.stringify(q.json ?? q).slice(0, 160)}`,
      repair: 'Ensure SenderCountry US enabled in DB; run migrations/seed',
    });
  }

  const badLadder = {
    ...validQuote,
    amountUsdCents: 333,
  };
  const q2 = await httpJson('POST', `${base}/api/checkout-pricing-quote`, badLadder);
  if (q2.status === 400) {
    row({
      code: 'LADDER_REJECT',
      severity: 'HIGH',
      status: 'PASS',
      message: 'Off-ladder amount 333¢ rejected with HTTP 400 (strict ladder active)',
    });
  } else {
    row({
      code: 'LADDER_REJECT',
      severity: 'HIGH',
      status: 'WARN',
      message: `Expected 400 for off-ladder amount; got status=${q2.status}`,
      repair: 'Verify resolveCheckoutPricing + phase1 ladder enforcement',
    });
  }

  const restricted = await httpJson('POST', `${base}/api/checkout-pricing-quote`, {
    currency: 'usd',
    senderCountry: 'US',
    amountUsdCents: 200,
    operatorKey: 'roshan',
    recipientPhone: '+989121234567',
  });
  if (restricted.status === 403) {
    row({
      code: 'RESTRICTED_DIAL',
      severity: 'HIGH',
      status: 'PASS',
      message: 'Blocked compliance dial prefix on quote path → 403',
    });
  } else if (restricted.status === 400) {
    row({
      code: 'RESTRICTED_DIAL',
      severity: 'MEDIUM',
      status: 'WARN',
      message: `Got 400 (schema/validation) instead of 403 for +98 phone — check blockRestrictedCountries vs body shape`,
    });
  } else {
    row({
      code: 'RESTRICTED_DIAL',
      severity: 'HIGH',
      status: 'WARN',
      message: `Unexpected status ${restricted.status} for +98 recipientPhone probe`,
      repair: 'Verify middleware collects recipientPhone from JSON body',
    });
  }

  const unauth = await httpJson('POST', `${base}/create-checkout-session`, {
    currency: 'usd',
    senderCountry: 'US',
    amountUsdCents: 200,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  });
  if (unauth.status === 401) {
    row({
      code: 'CHECKOUT_AUTH',
      severity: 'MEDIUM',
      status: 'PASS',
      message: 'Unauthenticated POST /create-checkout-session → 401 (blocked)',
    });
  } else {
    row({
      code: 'CHECKOUT_AUTH',
      severity: 'MEDIUM',
      status: 'WARN',
      message: `Expected 401 without auth; got ${unauth.status}`,
    });
  }
} else {
  row({
    code: 'HTTP_SKIPPED',
    severity: 'MEDIUM',
    status: 'WARN',
    message: `Server not listening on ${PORT} — skipped GET /health, pricing quote, ladder, restricted, checkout probes`,
    repair: 'Start API: npm --prefix server start',
  });
}

// --- Frontend API_BASE_URL documentation
const appConfig = join(repoRoot, 'lib', 'core', 'config', 'app_config.dart');
if (existsSync(appConfig)) {
  const src = readFileSync(appConfig, 'utf8');
  if (src.includes('API_BASE_URL') && src.includes('127.0.0.1:8787')) {
    row({
      code: 'FLUTTER_API_BASE_URL_DOC',
      severity: 'LOW',
      status: 'PASS',
      message: 'lib/core/config/app_config.dart documents API_BASE_URL / local port',
      file: appConfig,
    });
  } else {
    row({
      code: 'FLUTTER_API_BASE_URL_DOC',
      severity: 'LOW',
      status: 'WARN',
      message: 'app_config.dart may lack local dart-define example',
      file: appConfig,
    });
  }
}

// --- Git working tree
try {
  const gs = execFileSync('git', ['status', '--short'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const dirty = gs.trim().split(/\r?\n/).filter(Boolean).length;
  row({
    code: 'GIT_STATUS',
    severity: 'LOW',
    status: dirty ? 'WARN' : 'PASS',
    message: dirty
      ? `Working tree has ${dirty} changed/untracked entries (see git status)`
      : 'Git working tree clean',
    repair: dirty ? 'Review and commit intentionally' : undefined,
  });
} catch {
  row({
    code: 'GIT_STATUS',
    severity: 'LOW',
    status: 'WARN',
    message: 'Could not run git status',
  });
}

// --- Secret files tracked (must be empty)
try {
  const tracked = execFileSync(
    'git',
    ['ls-files', '--', '*.env', '*.env.local', '**/stripe_secret.key'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  if (!tracked) {
    row({
      code: 'SECRETS_TRACKED',
      severity: 'HIGH',
      status: 'PASS',
      message: 'No .env / stripe_secret.key tracked by git',
    });
  } else {
    row({
      code: 'SECRETS_TRACKED',
      severity: 'CRITICAL',
      status: 'FAIL',
      message: `Tracked secret-like files:\n${tracked}`,
      repair: 'git rm --cached … ; ensure .gitignore',
    });
  }
} catch {
  row({
    code: 'SECRETS_TRACKED',
    severity: 'LOW',
    status: 'WARN',
    message: 'Could not verify tracked secrets',
  });
}

// --- verify:local-pricing (deterministic in-process)
const vlp = spawnSync(process.execPath, ['scripts/verify-local-pricing-runtime.mjs'], {
  cwd: serverRoot,
  encoding: 'utf8',
  timeout: 25000,
  env: process.env,
});
if (vlp.status === 0) {
  row({
    code: 'VERIFY_LOCAL_PRICING',
    severity: 'MEDIUM',
    status: 'PASS',
    message: 'npm run verify:local-pricing (in-process ladder) succeeded',
    file: 'server/scripts/verify-local-pricing-runtime.mjs',
  });
} else {
  row({
    code: 'VERIFY_LOCAL_PRICING',
    severity: 'HIGH',
    status: 'FAIL',
    message: `verify:local-pricing failed: ${(vlp.stderr || vlp.stdout || '').slice(0, 240)}`,
    repair: 'Fix DB seed / SenderCountry US / pricing engine',
  });
}

// --- Print report
console.log('\n========== doctor:super-system ==========\n');
const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
rows.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

for (const r of rows) {
  console.log(`[${r.status}] ${r.severity}  ${r.code}`);
  console.log(`  ${r.message}`);
  if (r.file) console.log(`  file: ${r.file}`);
  if (r.repair) console.log(`  repair: ${r.repair}`);
  console.log('');
}

const failed = rows.filter((r) => r.status === 'FAIL');
const critical = failed.filter((r) => r.severity === 'CRITICAL');
console.log('Summary:', {
  total: rows.length,
  fail: failed.length,
  critical: critical.length,
  warn: rows.filter((r) => r.status === 'WARN').length,
});

if (critical.length > 0) {
  console.error('\nRESULT: FAIL (critical checks)\n');
  process.exit(1);
}
if (failed.length > 0) {
  console.error('\nRESULT: FAIL\n');
  process.exit(1);
}
console.log('\nRESULT: PASS (no FAIL rows)\n');
process.exit(0);
