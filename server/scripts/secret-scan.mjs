/**
 * L18 repository hygiene: detect **tracked** files whose lines look like embedded live-material secrets.
 * Prints matching **paths only** (never file contents). Exit 1 if any pattern hits.
 *
 * Run from repo root or server/: `npm --prefix server run secrets:scan`
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @returns {string} */
function findGitRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('[secrets:scan] .git not found — run from repository checkout');
    }
    dir = parent;
  }
}

const repoRoot = findGitRoot(join(__dirname, '..'));

/**
 * Stripe live secrets are long (well beyond minimum SDK validation length); code/tests use
 * shorter synthetic keys. Threshold below catches typical pasted Dashboard secrets.
 * Webhook signing secrets: exclude CI synthetic prefix `whsec_ci`.
 */
const PATTERNS = [
  {
    id: 'stripe_sk_live_material',
    regex: String.raw`sk_live_[0-9a-zA-Z]{56,}`,
  },
  {
    id: 'stripe_rk_live_material',
    regex: String.raw`rk_live_[0-9a-zA-Z]{56,}`,
  },
  {
    id: 'stripe_webhook_secret_material',
    regex: String.raw`whsec_(?!ci)[0-9a-zA-Z]{32,}`,
  },
];

/** Paths never scanned (documented CI synth strings, third-party actions). */
const EXCLUDE = [':(exclude).github', ':(exclude).dart_tool'];

function gitGrepList(pattern) {
  const args = [
    '-c',
    'core.quotepath=off',
    'grep',
    '-l',
    '--perl-regexp',
    pattern,
    '--',
    '.',
    ...EXCLUDE,
  ];
  const r = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.error) throw r.error;
  // git grep: exit 0 = matches, 1 = no matches, other = error
  if (r.status !== 0 && r.status !== 1) {
    console.error(r.stderr || '[secrets:scan] git grep failed');
    process.exit(2);
  }
  const out = String(r.stdout ?? '').trim();
  if (!out) return [];
  return out.split(/\r?\n/).filter(Boolean);
}

let failed = false;
for (const p of PATTERNS) {
  const files = gitGrepList(p.regex);
  if (files.length) {
    failed = true;
    console.error(`[secrets:scan] FAIL pattern=${p.id}`);
    for (const f of files) console.error(`  ${f}`);
  }
}

if (failed) {
  console.error(
    '\n[secrets:scan] Remove or redact material secrets from tracked files (see docs/SECRETS_MANAGEMENT.md).',
  );
  process.exit(1);
}

console.log('[secrets:scan] OK — no high-confidence live-secret patterns in tracked sources.');
process.exit(0);
