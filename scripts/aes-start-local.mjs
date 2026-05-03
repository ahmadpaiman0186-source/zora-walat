#!/usr/bin/env node
/**
 * Orchestrated local start: health → repair port + env → verify API → Next dev.
 * Does not start the backend automatically (prints exact commands instead).
 */
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runHealthOnce } from './aes-health.mjs';
import {
  AES_REPO_ROOT,
  appendAesLog,
  probeTcpListening,
} from './aes-internal.mjs';

const ROOT_SCRIPTS = path.dirname(fileURLToPath(import.meta.url));

function printUrls() {
  console.log('');
  console.log('[aes-start] Local URLs');
  console.log('[aes-start]   Frontend  http://localhost:3000');
  console.log('[aes-start]   Backend   http://127.0.0.1:8787');
  console.log('');
}

async function main() {
  appendAesLog({ action: 'smart_start_begin', result: 'start', meta: {} });

  spawnSync(process.execPath, [path.join(ROOT_SCRIPTS, 'next-env-banner.mjs')], {
    cwd: AES_REPO_ROOT,
    stdio: 'inherit',
  });

  let report = await runHealthOnce();
  console.log('[aes-start] Initial health severity:', report.severity);

  const repair = spawnSync(
    process.execPath,
    [path.join(ROOT_SCRIPTS, 'aes-repair.mjs'), '--fix-port-3000'],
    {
      cwd: AES_REPO_ROOT,
      stdio: 'inherit',
      encoding: 'utf8',
    },
  );

  appendAesLog({
    action: 'smart_start_repair_exit',
    result: repair.status === 0 ? 'pass' : 'warn',
    meta: { exitCode: repair.status },
  });

  report = await runHealthOnce();

  const apiReachable = Boolean(report.checks?.apiHttpReachable?.ok);
  const apiListening = Boolean(report.checks?.apiServerPort8787?.listening);

  if (!apiReachable || !apiListening) {
    console.error('');
    console.error('[aes-start] Backend API is not reachable. Start it in another terminal:');
    console.error('');
    console.error('    cd server && npm start');
    console.error('');
    console.error('  Or from repo root:');
    console.error('');
    console.error('    npm run api');
    console.error('');
    appendAesLog({
      action: 'smart_start_abort',
      result: 'fail',
      meta: { reason: 'api_unreachable', apiListening, apiReachable },
    });
    process.exit(1);
  }

  if (await probeTcpListening(3000)) {
    console.error(
      '[aes-start] Port 3000 is still in use after safe repair. Resolve manually (unsafe processes were not killed).',
    );
    appendAesLog({
      action: 'smart_start_abort',
      result: 'fail',
      meta: { reason: 'port_3000_busy' },
    });
    process.exit(1);
  }

  printUrls();

  if (process.env.AES_LOCAL_START_ONLY_CHECKS === '1') {
    appendAesLog({
      action: 'smart_start_dry_run_ok',
      result: 'pass',
      meta: {},
    });
    console.log('[aes-start] Dry-run complete (checks + repair only).');
    process.exit(0);
  }

  const req = createRequire(import.meta.url);
  let nextCli;
  try {
    nextCli = req.resolve('next/dist/bin/next');
  } catch {
    console.error('[aes-start] Could not resolve next/dist/bin/next — run npm install');
    process.exit(1);
  }

  appendAesLog({ action: 'smart_start_next_spawn', result: 'start', meta: {} });

  const child = spawn(process.execPath, [nextCli, 'dev', '-p', '3000'], {
    cwd: AES_REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    appendAesLog({
      action: 'smart_start_next_exit',
      result: code === 0 ? 'pass' : 'fail',
      meta: { exitCode: code },
    });
    process.exit(code ?? 1);
  });
}

main().catch((e) => {
  console.error(e);
  appendAesLog({
    action: 'smart_start_fatal',
    result: 'fail',
    meta: { message: e instanceof Error ? e.message : String(e) },
  });
  process.exit(1);
});
