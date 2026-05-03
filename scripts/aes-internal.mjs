/**
 * Shared helpers for AES scripts — no secrets in logs.
 */
import { execSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const AES_REPO_ROOT = resolve(__dirname, '..');
export const AES_LOG_PATH = join(AES_REPO_ROOT, 'logs', 'aes.log');
export const STRIPE_PK_KEY = 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY';
export const NEXT_PUBLIC_API_URL_KEY = 'NEXT_PUBLIC_API_URL';
/** Default local API origin for browser → server calls (public URL only). */
export const DEFAULT_PUBLIC_API_URL = 'http://127.0.0.1:8787';

/** @param {string} raw */
export function stripBom(raw) {
  if (raw.charCodeAt(0) === 0xfeff) return raw.slice(1);
  return raw;
}

/** @param {string} text */
export function parseDotEnvLines(text) {
  /** @type {Record<string, string>} */
  const out = {};
  const lines = stripBom(text).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/** @param {string} pk */
export function isStructurallyValidPublishableKey(pk) {
  const v = String(pk ?? '').trim();
  if (!v) return false;
  if (!v.startsWith('pk_test_') && !v.startsWith('pk_live_')) return false;
  if (v.length < 24 || v.length > 256 || /\s/.test(v)) return false;
  return /^pk_(test|live)_[A-Za-z0-9_]+$/.test(v);
}

/** @param {string} pk */
export function maskPublishableKey(pk) {
  const v = String(pk ?? '').trim();
  if (!v) return '(none)';
  if (!v.startsWith('pk_')) return '(invalid prefix)';
  const head = v.slice(0, 16);
  const tail = v.length > 8 ? v.slice(-4) : '';
  return `${head}…${tail}`;
}

/** @param {string} relativePath */
export function readEnvFile(relativePath) {
  const p = join(AES_REPO_ROOT, relativePath);
  if (!existsSync(p)) return { path: p, exists: false, parsed: {} };
  const text = readFileSync(p, 'utf8');
  return { path: p, exists: true, parsed: parseDotEnvLines(text) };
}

/**
 * Append one JSON line to logs/aes.log (creates logs/ directory).
 * Never pass secrets — meta must be redacted.
 * @param {{ action: string, result: string, severity?: string, meta?: Record<string, unknown> }} entry
 */
export function appendAesLog(entry) {
  try {
    mkdirSync(join(AES_REPO_ROOT, 'logs'), { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      subsystem: 'aes',
      ...entry,
    });
    appendFileSync(AES_LOG_PATH, `${line}\n`, 'utf8');
  } catch (e) {
    console.error('[aes] log append failed', e instanceof Error ? e.message : e);
  }
}

/** Lowercase path with forward slashes for substring checks. */
export function normalizePathForRepoMatch(absPath) {
  return String(absPath ?? '')
    .replace(/\\/g, '/')
    .toLowerCase();
}

/**
 * Redact secrets from a process command line before printing.
 * @param {string} cmd
 */
export function redactCommandLineForDisplay(cmd) {
  let s = String(cmd ?? '');
  s = s.replace(/\bsk_(live|test)_[A-Za-z0-9]+\b/g, 'sk_$1_[REDACTED]');
  s = s.replace(/\bwhsec_[A-Za-z0-9]+\b/g, 'whsec_[REDACTED]');
  s = s.replace(/\bEMAIL_PASS=[^\s]+\b/gi, 'EMAIL_PASS=[REDACTED]');
  if (s.length > 400) s = `${s.slice(0, 397)}...`;
  return s || '(empty)';
}

/**
 * Safe-to-stop for port 3000: must be node and command line must reference this repo root.
 * @param {string} repoRoot
 * @param {string | undefined} processName
 * @param {string | undefined} commandLine
 * @returns {'repo_node_safe' | 'not_node' | 'not_repo_path'}
 */
export function classifyRepoOwnedNodeProcess(repoRoot, processName, commandLine) {
  const name = String(processName ?? '').trim().toLowerCase();
  if (name !== 'node.exe' && name !== 'node') return 'not_node';
  const fp = normalizePathForRepoMatch(repoRoot);
  const cl = normalizePathForRepoMatch(commandLine ?? '');
  if (!fp || !cl.includes(fp)) return 'not_repo_path';
  return 'repo_node_safe';
}

/**
 * @param {string} pid
 * @returns {{ ok: boolean, pid?: string, name?: string, commandLine?: string, error?: string }}
 */
export function getWindowsProcessInspect(pid) {
  const id = String(pid).replace(/[^\d]/g, '');
  if (!id || id === '0') return { ok: false, error: 'bad_pid' };
  try {
    const r = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "ProcessId=${id}" | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress`,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
    );
    if (r.status !== 0 && !r.stdout?.trim()) {
      return { ok: false, error: 'powershell_failed' };
    }
    const raw = r.stdout?.trim() ?? '';
    if (!raw) return { ok: false, error: 'empty_stdout' };
    const j = JSON.parse(raw);
    const row = Array.isArray(j) ? j[0] : j;
    if (!row || row.ProcessId == null) return { ok: false, error: 'no_process' };
    return {
      ok: true,
      pid: String(row.ProcessId),
      name: row.Name ?? '',
      commandLine: row.CommandLine ?? '',
    };
  } catch {
    return { ok: false, error: 'inspect_exception' };
  }
}

/** TCP port has something accepting connections (same semantics as health probe). */
export function probeTcpListening(port, host = '127.0.0.1', timeoutMs = 1200) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ port, host }, () => {
      sock.end();
      resolve(true);
    });
    sock.setTimeout(timeoutMs);
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.on('error', () => resolve(false));
  });
}

/** Windows: PIDs listening on TCP port (best-effort). */
export function suggestPidsForPort(port) {
  if (process.platform !== 'win32') {
    return {
      supported: false,
      hint: 'use `lsof -i :PORT` or `ss -tlnp` on this OS',
    };
  }
  try {
    const out = execSync(`netstat -ano -p tcp`, {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 512 * 1024,
    });
    const lines = out.split(/\r?\n/).filter((l) => {
      const lower = l.toLowerCase();
      return (
        lower.includes(`:${port}`) &&
        (lower.includes('listening') || lower.includes('listen'))
      );
    });
    /** @type {Set<string>} */
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) pids.add(last);
    }
    return {
      supported: true,
      pids: [...pids],
      hint:
        pids.size > 0
          ? 'taskkill /PID <pid> /F  (only if you intend to free the port)'
          : null,
    };
  } catch {
    return { supported: true, pids: [], hint: 'netstat parse failed' };
  }
}

/**
 * Append NEXT_PUBLIC_API_URL to root .env.local when missing (safe, public URL only).
 * @returns {{ changed: boolean, path: string, value?: string }}
 */
export function ensureRootPublicApiUrl() {
  const rel = '.env.local';
  const { path, exists, parsed } = readEnvFile(rel);
  const cur = String(parsed[NEXT_PUBLIC_API_URL_KEY] ?? '').trim();
  if (cur) {
    return { changed: false, path, value: cur };
  }
  const block =
    `\n# AES: browser → API origin (public)\n${NEXT_PUBLIC_API_URL_KEY}=${DEFAULT_PUBLIC_API_URL}\n`;
  if (!exists) {
    writeFileSync(
      path,
      `# AES: minimal root .env.local (secrets stay in server/.env.local)\n${block}`,
      'utf8',
    );
  } else {
    appendFileSync(path, block, 'utf8');
  }
  appendAesLog({
    action: 'ensure_root_api_url',
    result: 'applied',
    meta: { key: NEXT_PUBLIC_API_URL_KEY, urlShape: '127.0.0.1:8787' },
  });
  return { changed: true, path, value: DEFAULT_PUBLIC_API_URL };
}

/**
 * Secret-ish key name detection for doctor summaries (names only, no values).
 * @param {string} key
 */
export function keyLooksSecret(key) {
  const k = String(key).toUpperCase();
  if (/_TTL$/.test(k) || k.endsWith('_TTL_MS')) return false;
  return (
    k.includes('SECRET') ||
    k.includes('PASSWORD') ||
    (k.includes('PASS') && k.includes('EMAIL')) ||
    k.includes('WEBHOOK_SECRET') ||
    k.includes('DATABASE_URL') ||
    k.includes('PRIVATE_KEY') ||
    (k.includes('API_KEY') && !k.startsWith('NEXT_PUBLIC_')) ||
    (k.includes('TOKEN') &&
      !k.startsWith('OTP_') &&
      !k.includes('OTP_TRANSPORT')) ||
    (k.includes('RELOADLY') && k.includes('SECRET'))
  );
}

/** Lines changed in git working tree (best-effort). No content leaked. */
export function probeGitDirtyLineCount() {
  try {
    const out = execSync('git status --porcelain', {
      cwd: AES_REPO_ROOT,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    });
    const n = out.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
    return { supported: true, dirtyLineCount: n };
  } catch {
    return {
      supported: false,
      dirtyLineCount: null,
      hint: 'git_unavailable_or_not_a_repo',
    };
  }
}

/**
 * Runs server's DB probe script (exit code only in callers — stdout may contain ok/fail).
 */
export function probeDatabaseConnectivitySafe() {
  const script = join(AES_REPO_ROOT, 'server', 'scripts', 'test-db-connection.mjs');
  if (!existsSync(script)) {
    return { ok: false, probed: false, reason: 'script_missing' };
  }
  const r = spawnSync(process.execPath, [script], {
    cwd: join(AES_REPO_ROOT, 'server'),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 45_000,
    maxBuffer: 256 * 1024,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const ok = r.status === 0 && out.includes('connection: ok');
  return { ok, probed: true, exitCode: r.status ?? -1 };
}

/** Stripe webhook secret presence for misconfiguration warnings — never exposes value. */
export function probeStripeWebhookSecretPresent() {
  const sl = readEnvFile(join('server', '.env.local'));
  const v = String(sl.parsed.STRIPE_WEBHOOK_SECRET ?? '').trim();
  return {
    looksConfigured: v.length > 0 && v.startsWith('whsec_'),
    envFileExists: sl.exists,
  };
}

export function probeRedisUrlPresent() {
  const sl = readEnvFile(join('server', '.env.local'));
  return {
    redisUrlConfigured: Boolean(String(sl.parsed.REDIS_URL ?? '').trim()),
    envFileExists: sl.exists,
  };
}

/**
 * Parse `prisma migrate status` stdout/stderr — count migration folder lines (no DB writes).
 * @param {string} text
 */
export function countPendingMigrationsFromStatusOutput(text) {
  const raw = String(text ?? '');
  if (!raw.includes('have not yet been applied')) return 0;
  let n = 0;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (/^\d{14}_/.test(t)) n += 1;
  }
  return n;
}

/**
 * Read-only drift check: runs `npx prisma migrate status` in server/. Does **not** apply migrations.
 * Never returns raw datasource URLs (only counts + exit metadata).
 */
export function probePrismaMigrationDrift() {
  const serverRoot = join(AES_REPO_ROOT, 'server');
  if (!existsSync(join(serverRoot, 'package.json'))) {
    return { supported: false, probed: false, reason: 'no_server_package' };
  }
  try {
    const r = spawnSync('npx', ['prisma', 'migrate', 'status'], {
      cwd: serverRoot,
      encoding: 'utf8',
      shell: true,
      windowsHide: true,
      timeout: 90_000,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env },
    });
    const combined = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
    const pendingCount = countPendingMigrationsFromStatusOutput(combined);

    return {
      supported: true,
      probed: true,
      pendingCount,
      schemaUpToDate: pendingCount === 0 && r.status === 0,
      exitCode: r.status ?? -1,
      timedOut: r.signal === 'SIGTERM',
    };
  } catch (e) {
    return {
      supported: true,
      probed: false,
      reason: 'migrate_status_spawn_failed',
      detail: e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120),
    };
  }
}
