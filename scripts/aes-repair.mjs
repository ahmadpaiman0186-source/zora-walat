#!/usr/bin/env node
/**
 * AES repair: Stripe pk (doctor), NEXT_PUBLIC_API_URL (idempotent),
 * optional safe Windows port-3000 cleanup (repo-owned node only),
 * API reachability probe (does not start servers).
 *
 * Flags:
 *   --ensure-api-url   append NEXT_PUBLIC_API_URL when missing (default: ON)
 *   --no-ensure-api-url
 *   --fix-port-3000    terminate repo-owned node.exe on :3000 after WMI classification
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';

import {
  AES_REPO_ROOT,
  STRIPE_PK_KEY,
  appendAesLog,
  classifyRepoOwnedNodeProcess,
  ensureRootPublicApiUrl,
  getWindowsProcessInspect,
  isStructurallyValidPublishableKey,
  probeTcpListening,
  readEnvFile,
  redactCommandLineForDisplay,
  suggestPidsForPort,
} from './aes-internal.mjs';

const HEALTH_PATH = '/health';
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_DELAY_MS = 2000;
const NEXT_PORT = 3000;

/** @param {string} baseUrl */
async function probeApiWithRetries(baseUrl) {
  const url = `${baseUrl.replace(/\/+$/, '')}${HEALTH_PATH}`;
  for (let i = 1; i <= API_RETRY_ATTEMPTS; i += 1) {
    appendAesLog({
      action: 'repair_api_probe_attempt',
      result: 'attempt',
      meta: { attempt: i, path: HEALTH_PATH },
    });
    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 5000);
      const res = await fetch(url, {
        method: 'GET',
        signal: ac.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(to);
      if (res.ok) {
        appendAesLog({
          action: 'repair_api_probe',
          result: 'pass',
          meta: { attempt: i, status: res.status },
        });
        return { ok: true, attempt: i, status: res.status };
      }
      appendAesLog({
        action: 'repair_api_probe',
        result: 'warn',
        meta: { attempt: i, status: res.status },
      });
    } catch (e) {
      appendAesLog({
        action: 'repair_api_probe',
        result: 'fail',
        meta: {
          attempt: i,
          error: e instanceof Error ? e.name : 'unknown',
        },
      });
    }
    if (i < API_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, API_RETRY_DELAY_MS));
    }
  }
  return { ok: false };
}

function runDoctorRepair() {
  const script = join(AES_REPO_ROOT, 'scripts', 'doctor-next-env.mjs');
  const r = spawnSync(process.execPath, [script, '--repair'], {
    cwd: AES_REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  appendAesLog({
    action: 'repair_doctor_next_env',
    result: r.status === 0 ? 'pass' : 'fail',
    meta: { exitCode: r.status ?? null },
  });
  return r.status === 0;
}

/**
 * @returns {Promise<{ attempted: boolean, killedPids: string[], skippedUnsafe: { pid: string, classification: string, commandLineRedacted: string }[], portFreeAfter: boolean | null }>}
 */
async function repairPort3000IfRequested(fixPort) {
  const result = {
    attempted: fixPort,
    killedPids: /** @type {string[]} */ ([]),
    skippedUnsafe: /** @type { { pid: string, classification: string, commandLineRedacted: string }[]} */ (
      []
    ),
    portFreeAfter: null,
  };

  if (!fixPort) {
    return result;
  }

  if (process.platform !== 'win32') {
    appendAesLog({
      action: 'repair_port_3000',
      result: 'skip',
      meta: { reason: 'non_windows_automation_not_implemented' },
    });
    console.error(
      '[aes-repair] --fix-port-3000: automated kill is only implemented on Windows. Use lsof/ss manually.',
    );
    return result;
  }

  const listeningBefore = await probeTcpListening(NEXT_PORT);
  if (!listeningBefore) {
    appendAesLog({
      action: 'repair_port_3000',
      result: 'skip',
      meta: { reason: 'port_already_free' },
    });
    result.portFreeAfter = true;
    return result;
  }

  const hint = suggestPidsForPort(NEXT_PORT);
  const pids = hint.pids ?? [];

  for (const pid of pids) {
    const insp = getWindowsProcessInspect(pid);
    if (!insp.ok || !insp.name) {
      appendAesLog({
        action: 'repair_port_3000_inspect',
        result: 'fail',
        meta: { pid, error: insp.error ?? 'unknown' },
      });
      result.skippedUnsafe.push({
        pid,
        classification: 'inspect_failed',
        commandLineRedacted: '(inspect failed)',
      });
      continue;
    }

    const cls = classifyRepoOwnedNodeProcess(
      AES_REPO_ROOT,
      insp.name,
      insp.commandLine,
    );

    const redacted = redactCommandLineForDisplay(insp.commandLine ?? '');

    if (cls !== 'repo_node_safe') {
      appendAesLog({
        action: 'repair_port_3000_refuse',
        result: 'refuse',
        meta: {
          pid,
          classification: cls,
          processName: insp.name,
        },
      });
      result.skippedUnsafe.push({
        pid,
        classification: cls,
        commandLineRedacted: redacted,
      });
      console.error(
        `[aes-repair] Refusing to kill PID ${pid} (${insp.name}): not classified as repo-owned node. CommandLine (redacted): ${redacted}`,
      );
      console.error(
        '[aes-repair] Manual: verify this process, then stop it yourself if appropriate.',
      );
      continue;
    }

    const tk = spawnSync('taskkill', ['/PID', pid, '/F'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const ok = tk.status === 0;
    appendAesLog({
      action: 'repair_port_3000_kill',
      result: ok ? 'pass' : 'fail',
      meta: { pid, exitCode: tk.status },
    });
    if (ok) {
      result.killedPids.push(pid);
    }

    await new Promise((r) => setTimeout(r, 400));
    const free = !(await probeTcpListening(NEXT_PORT));
    if (free) {
      result.portFreeAfter = true;
      break;
    }
  }

  if (result.portFreeAfter == null) {
    result.portFreeAfter = !(await probeTcpListening(NEXT_PORT));
  }

  return result;
}

async function main() {
  const fixPort = process.argv.includes('--fix-port-3000');
  const noEnsureApi = process.argv.includes('--no-ensure-api-url');
  const ensureApi = !noEnsureApi;

  appendAesLog({
    action: 'repair_start',
    result: 'start',
    meta: { fix_port_3000: fixPort, ensure_api_url: ensureApi },
  });

  const beforeRoot = readEnvFile('.env.local');
  const pkBefore = beforeRoot.parsed[STRIPE_PK_KEY] ?? '';
  let doctorRan = false;
  let doctorOk = false;

  if (!isStructurallyValidPublishableKey(pkBefore)) {
    doctorRan = true;
    doctorOk = runDoctorRepair();
  } else {
    appendAesLog({
      action: 'repair_skip_stripe',
      result: 'skip',
      meta: { reason: 'root_pk_already_valid' },
    });
  }

  /** @type {{ changed: boolean; path: string; value?: string }} */
  let apiUrlEnsure = { changed: false, path: join(AES_REPO_ROOT, '.env.local') };
  if (ensureApi) {
    apiUrlEnsure = ensureRootPublicApiUrl();
  }

  const portRepair = await repairPort3000IfRequested(fixPort);

  const afterRoot = readEnvFile('.env.local');
  const apiBase =
    String(afterRoot.parsed.NEXT_PUBLIC_API_URL ?? '').trim() ||
    'http://127.0.0.1:8787';

  const apiResult = await probeApiWithRetries(apiBase);
  const port3000 = suggestPidsForPort(NEXT_PORT);

  const report = {
    schemaVersion: 2,
    repoRoot: AES_REPO_ROOT,
    timestamp: new Date().toISOString(),
    repaired: {
      doctorRepairAttempted: doctorRan,
      doctorRepairExitOk: doctorRan ? doctorOk : null,
      stripePublishableKeyNowValid: isStructurallyValidPublishableKey(
        afterRoot.parsed[STRIPE_PK_KEY] ?? '',
      ),
      rootApiUrlEnsured: apiUrlEnsure.changed,
      apiUrlValueShape: apiUrlEnsure.changed
        ? 'http://127.0.0.1:8787'
        : '(unchanged or already set)',
      port3000Repair: portRepair,
      apiReachableAfterRetries: apiResult.ok,
    },
    port3000PidHint: port3000,
    hints: {
      apiDown: apiResult.ok
        ? null
        : 'API unreachable — start backend: cd server && npm start   (or npm run api from repo root)',
      port3000:
        Array.isArray(port3000.pids) && port3000.pids.length > 0
          ? 'Port 3000 still has listeners if repair refused unsafe PIDs — resolve manually.'
          : null,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  appendAesLog({
    action: 'repair_complete',
    result: apiResult.ok ? 'pass' : 'partial',
    meta: {
      doctor_ran: doctorRan,
      doctor_ok: doctorOk,
      api_ok: apiResult.ok,
      api_url_ensured: apiUrlEnsure.changed,
      port_kill_count: portRepair.killedPids.length,
    },
  });
}

main().catch((e) => {
  console.error(e);
  appendAesLog({
    action: 'repair_fatal',
    result: 'fail',
    meta: { message: e instanceof Error ? e.message : String(e) },
  });
  process.exit(1);
});
