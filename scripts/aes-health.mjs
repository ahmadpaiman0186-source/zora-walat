#!/usr/bin/env node
/**
 * Autonomous Engineering System — health sweep (env, ports, API).
 * Outputs JSON + severity; optional --watch interval.
 * No secrets — masked Stripe preview only.
 */
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const { join } = path;

import {
  AES_REPO_ROOT,
  STRIPE_PK_KEY,
  appendAesLog,
  isStructurallyValidPublishableKey,
  maskPublishableKey,
  probeDatabaseConnectivitySafe,
  probeGitDirtyLineCount,
  probePrismaMigrationDrift,
  probeRedisUrlPresent,
  probeStripeWebhookSecretPresent,
  probeTcpListening,
  readEnvFile,
  suggestPidsForPort,
} from './aes-internal.mjs';

const API_PORT = 8787;
const NEXT_PORT = 3000;
const HEALTH_PATH = '/health';
const WATCH_INTERVAL_MS = 30_000;

/** @param {string} baseUrl */
async function probeHttpHealth(baseUrl) {
  const url = `${baseUrl.replace(/\/+$/, '')}${HEALTH_PATH}`;
  const t0 = Date.now();
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 5000);
    const res = await fetch(url, {
      method: 'GET',
      signal: ac.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(to);
    const ms = Date.now() - t0;
    return {
      ok: res.ok,
      status: res.status,
      ms,
      path: HEALTH_PATH,
    };
  } catch (e) {
    const ms = Date.now() - t0;
    const name = e instanceof Error ? e.name : 'Error';
    return {
      ok: false,
      status: null,
      ms,
      path: HEALTH_PATH,
      error: name === 'AbortError' ? 'timeout' : 'fetch_failed',
    };
  }
}

/** @param {{ stripeOk: boolean; port8787: { listening?: boolean }; apiHttp: { ok?: boolean }; port3000: { listening?: boolean }; dbOk?: boolean; prismaMigrationsPending?: boolean }} p */
function computeSeverity(p) {
  /** @type {'ok' | 'warning' | 'critical'} */
  let severity = 'ok';
  if (!p.stripeOk) severity = 'critical';
  else if (!p.port8787.listening) severity = 'critical';
  else if (!p.apiHttp.ok) severity = 'critical';
  else if (p.dbOk === false) severity = 'warning';
  else if (!p.port3000.listening) severity = 'warning';
  else if (p.prismaMigrationsPending) severity = 'warning';
  return severity;
}

/** Exported for orchestration (e.g. aes-start-local). */
export async function runHealthOnce() {
  const rootLocal = readEnvFile('.env.local');
  const pkRaw = rootLocal.parsed[STRIPE_PK_KEY] ?? '';
  const stripeValid = isStructurallyValidPublishableKey(pkRaw);

  const apiPort8787Listening = await probeTcpListening(API_PORT);
  const nextPort3000Listening = await probeTcpListening(NEXT_PORT);

  const apiBase =
    String(rootLocal.parsed.NEXT_PUBLIC_API_URL ?? '').trim() ||
    'http://127.0.0.1:8787';
  const normalizedBase = apiBase.replace(/\/+$/, '');
  const apiHttp = await probeHttpHealth(normalizedBase);

  const port3000Meta = suggestPidsForPort(NEXT_PORT);

  const serverLocal = readEnvFile(join('server', '.env.local'));
  const serverPkHint =
    !stripeValid &&
    isStructurallyValidPublishableKey(serverLocal.parsed[STRIPE_PK_KEY] ?? '');

  const dbProbe = probeDatabaseConnectivitySafe();
  const migrateProbe = probePrismaMigrationDrift();
  const gitProbe = probeGitDirtyLineCount();
  const webhookProbe = probeStripeWebhookSecretPresent();
  const redisProbe = probeRedisUrlPresent();

  const prismaMigrationsPending =
    migrateProbe.probed === true &&
    typeof migrateProbe.pendingCount === 'number' &&
    migrateProbe.pendingCount > 0;

  /** @type {Record<string, unknown>} */
  const checks = {
    stripePublishableKeyRoot: {
      envFileExists: rootLocal.exists,
      envFilePath: rootLocal.path,
      valid: stripeValid,
      masked: maskPublishableKey(pkRaw),
      keyName: STRIPE_PK_KEY,
    },
    apiServerPort8787: {
      port: API_PORT,
      listening: apiPort8787Listening,
    },
    nextDevPort3000: {
      port: NEXT_PORT,
      listening: nextPort3000Listening,
      pidHint: port3000Meta,
    },
    apiHttpReachable: {
      baseUrlUsed: normalizedBase,
      ...apiHttp,
    },
    nextPublicApiUrlConfigured: Boolean(
      String(rootLocal.parsed.NEXT_PUBLIC_API_URL ?? '').trim(),
    ),
    databaseConnectivity: {
      ok: dbProbe.ok,
      probed: dbProbe.probed,
      ...(dbProbe.exitCode != null ? { exitCode: dbProbe.exitCode } : {}),
      ...(dbProbe.reason ? { reason: dbProbe.reason } : {}),
    },
    gitWorkingCopy: {
      supported: gitProbe.supported,
      dirtyLineCount: gitProbe.dirtyLineCount,
      ...(gitProbe.hint ? { hint: gitProbe.hint } : {}),
    },
    stripeWebhookSecret: webhookProbe,
    redisConfigured: redisProbe,
    prismaMigrationDrift: {
      supported: migrateProbe.supported,
      probed: migrateProbe.probed,
      ...(migrateProbe.pendingCount != null
        ? { pendingCount: migrateProbe.pendingCount }
        : {}),
      ...(migrateProbe.schemaUpToDate != null
        ? { schemaUpToDate: migrateProbe.schemaUpToDate }
        : {}),
      ...(migrateProbe.exitCode != null ? { exitCode: migrateProbe.exitCode } : {}),
      ...(migrateProbe.reason ? { reason: migrateProbe.reason } : {}),
      ...(migrateProbe.timedOut ? { timedOut: true } : {}),
    },
  };

  const severity = computeSeverity({
    stripeOk: stripeValid,
    port8787: { listening: apiPort8787Listening },
    apiHttp,
    port3000: { listening: nextPort3000Listening },
    dbOk: dbProbe.ok || dbProbe.probed === false,
    prismaMigrationsPending,
  });

  const report = {
    schemaVersion: 4,
    repoRoot: AES_REPO_ROOT,
    timestamp: new Date().toISOString(),
    severity,
    checks,
    hints: {
      stripeRootEnv: serverPkHint
        ? 'Publishable key may exist only in server/.env.local — run npm run doctor:next-env:repair'
        : null,
      nextRestart:
        'After editing root .env.local, restart Next.js so NEXT_PUBLIC_* is picked up.',
      webhookMisconfiguration: webhookProbe.looksConfigured
        ? null
        : serverLocal.exists
          ? 'STRIPE_WEBHOOK_SECRET missing or not whsec_* in server/.env.local — webhook verification will fail.'
          : 'server/.env.local missing — configure webhook secret for Stripe.',
      databaseDown:
        dbProbe.ok || !dbProbe.probed
          ? null
          : 'Database probe failed — run npm --prefix server run db:health',
      gitDirty:
        gitProbe.supported && gitProbe.dirtyLineCount && gitProbe.dirtyLineCount > 0
          ? `Working tree has ${gitProbe.dirtyLineCount} changed/untracked line(s) — commit before release.`
          : null,
      prismaMigrationsPending:
        prismaMigrationsPending && migrateProbe.pendingCount != null
          ? `${migrateProbe.pendingCount} Prisma migration(s) not applied — run: cd server && npm run db:migrate && npm run generate (CanonicalTransaction / schema drift until then).`
          : migrateProbe.probed === false && migrateProbe.reason === 'migrate_status_spawn_failed'
            ? 'Could not run prisma migrate status — check Node/npx and server/node_modules.'
            : null,
    },
  };

  appendAesLog({
    action: 'health_cycle',
    result:
      severity === 'ok' ? 'pass' : severity === 'warning' ? 'warn' : 'fail',
    severity,
    meta: {
      stripe_ok: stripeValid,
      port_8787: apiPort8787Listening,
      port_3000: nextPort3000Listening,
      api_http_ok: Boolean(apiHttp.ok),
      db_ok: dbProbe.ok,
      webhook_configured: webhookProbe.looksConfigured,
      git_dirty_lines: gitProbe.dirtyLineCount ?? null,
      prisma_pending_migrations:
        migrateProbe.pendingCount != null ? migrateProbe.pendingCount : null,
    },
  });

  return report;
}

async function main() {
  const watch = process.argv.includes('--watch');

  const report = await runHealthOnce();
  console.log(JSON.stringify(report, null, 2));

  if (!watch && report.severity === 'critical') {
    process.exit(1);
  }

  if (watch) {
    setInterval(async () => {
      try {
        const r = await runHealthOnce();
        console.log(JSON.stringify(r, null, 2));
      } catch (e) {
        console.error('[aes-health] watch cycle error', e);
        appendAesLog({
          action: 'health_watch_error',
          result: 'error',
          severity: 'warning',
          meta: {
            message: e instanceof Error ? e.message : String(e),
          },
        });
      }
    }, WATCH_INTERVAL_MS);
  }
}

const __thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
const runCli =
  invoked && path.resolve(invoked) === path.resolve(__thisFile);

if (runCli) {
  main().catch((e) => {
    console.error(e);
    appendAesLog({
      action: 'health_fatal',
      result: 'fail',
      severity: 'critical',
      meta: { message: e instanceof Error ? e.message : String(e) },
    });
    process.exit(1);
  });
}
