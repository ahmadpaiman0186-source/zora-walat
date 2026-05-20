/**
 * L-11 operator Stripe secret resolution (enum-only diagnostics, no secrets in output).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  effectiveStripeSecretKey,
  readStripeSecretKeyFileFromRoot,
} from '../src/config/stripeEnv.js';

/** @typedef {'process_env' | 'env_local' | 'env' | 'file' | 'missing' | 'ambiguous'} StripeSecretSource */

/** @typedef {'test_secret' | 'test_restricted' | 'live_blocked' | 'malformed' | 'missing' | 'placeholder' | 'ambiguous'} StripeSecretKeyMode */

const PLACEHOLDER_FRAGMENTS = [
  'your_real',
  'your_secret',
  'placeholder',
  'replace_me',
  'sk_test_replace',
  'sk_live_replace',
  'real_key',
  'changeme',
  'xxx',
  'example',
];

/**
 * @param {string | null | undefined} raw
 */
export function normalizeStripeSecretRaw(raw) {
  return effectiveStripeSecretKey(raw);
}

/**
 * @param {string | null | undefined} raw
 * @returns {boolean}
 */
export function stripeSecretRawWasQuoted(raw) {
  const s = String(raw ?? '').trim();
  return (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  );
}

/**
 * @param {string | null | undefined} raw
 * @returns {StripeSecretKeyMode}
 */
export function classifyStripeSecretKeyMode(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 'missing';

  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_FRAGMENTS.some((frag) => lower.includes(frag))) {
    return 'placeholder';
  }

  const normalized = normalizeStripeSecretRaw(trimmed);
  if (!normalized) {
    if (
      trimmed.startsWith('sk_live_') ||
      trimmed.startsWith('rk_live_')
    ) {
      return trimmed.length >= 60 ? 'live_blocked' : 'malformed';
    }
    if (
      trimmed.startsWith('sk_test_') ||
      trimmed.startsWith('rk_test_')
    ) {
      return trimmed.length >= 60 ? 'malformed' : 'malformed';
    }
    return 'malformed';
  }

  if (normalized.startsWith('sk_test_')) return 'test_secret';
  if (normalized.startsWith('rk_test_')) return 'test_restricted';
  if (normalized.startsWith('sk_live_') || normalized.startsWith('rk_live_')) {
    return 'live_blocked';
  }
  return 'malformed';
}

/**
 * @param {string} content
 */
function countStripeSecretKeyAssignments(content) {
  const lines = String(content ?? '').split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (/^\s*(?:export\s+)?STRIPE_SECRET_KEY\s*=/.test(line)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Last STRIPE_SECRET_KEY= assignment in a dotenv file (value never logged).
 * @param {string} filePath
 */
function readLastStripeAssignmentFromEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return { present: false, raw: null, duplicateCount: 0 };
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    const duplicateCount = countStripeSecretKeyAssignments(content);
    const lines = content.split(/\r?\n/);
    let raw = null;
    for (const line of lines) {
      const m = line.match(/^\s*(?:export\s+)?STRIPE_SECRET_KEY\s*=\s*(.*)$/);
      if (m) {
        raw = m[1].trim();
      }
    }
    return { present: raw !== null, raw, duplicateCount };
  } catch {
    return { present: false, raw: null, duplicateCount: 0 };
  }
}

/**
 * @param {string} serverRoot
 * @param {string | undefined} stripeKeyBeforeDotenv
 */
export function resolveL11OperatorStripeKey({ serverRoot, stripeKeyBeforeDotenv }) {
  const envPath = join(serverRoot, '.env');
  const envLocalPath = join(serverRoot, '.env.local');

  const shellRaw =
    stripeKeyBeforeDotenv !== undefined
      ? String(stripeKeyBeforeDotenv)
      : null;
  const shellNorm = shellRaw !== null ? normalizeStripeSecretRaw(shellRaw) : null;
  const shellQuoted = shellRaw !== null ? stripeSecretRawWasQuoted(shellRaw) : false;

  const envFile = readLastStripeAssignmentFromEnvFile(envPath);
  const envLocalFile = readLastStripeAssignmentFromEnvFile(envLocalPath);
  const fileRaw = readStripeSecretKeyFileFromRoot(serverRoot);
  const fileNorm = fileRaw ? normalizeStripeSecretRaw(fileRaw) : null;

  const envNorm = envFile.raw !== null ? normalizeStripeSecretRaw(envFile.raw) : null;
  const envLocalNorm =
    envLocalFile.raw !== null ? normalizeStripeSecretRaw(envLocalFile.raw) : null;

  const duplicateCount =
    envFile.duplicateCount + envLocalFile.duplicateCount;

  const candidates = [];
  if (shellNorm) {
    candidates.push({ source: 'process_env', key: shellNorm, mode: classifyStripeSecretKeyMode(shellRaw) });
  }
  if (envLocalNorm) {
    candidates.push({
      source: 'env_local',
      key: envLocalNorm,
      mode: classifyStripeSecretKeyMode(envLocalFile.raw),
    });
  }
  if (envNorm) {
    candidates.push({
      source: 'env',
      key: envNorm,
      mode: classifyStripeSecretKeyMode(envFile.raw),
    });
  }
  if (fileNorm) {
    candidates.push({
      source: 'file',
      key: fileNorm,
      mode: classifyStripeSecretKeyMode(fileRaw),
    });
  }

  const testModes = new Set(['test_secret', 'test_restricted']);
  const testCandidates = candidates.filter((c) => testModes.has(c.mode));

  let effectiveKey = null;
  /** @type {StripeSecretSource} */
  let effectiveSource = 'missing';
  /** @type {StripeSecretKeyMode} */
  let keyMode = 'missing';

  if (shellNorm) {
    effectiveKey = shellNorm;
    effectiveSource = 'process_env';
    keyMode = classifyStripeSecretKeyMode(shellRaw);
  } else if (envLocalNorm) {
    effectiveKey = envLocalNorm;
    effectiveSource = 'env_local';
    keyMode = classifyStripeSecretKeyMode(envLocalFile.raw);
  } else if (envNorm) {
    effectiveKey = envNorm;
    effectiveSource = 'env';
    keyMode = classifyStripeSecretKeyMode(envFile.raw);
  } else if (fileNorm) {
    effectiveKey = fileNorm;
    effectiveSource = 'file';
    keyMode = classifyStripeSecretKeyMode(fileRaw);
  } else if (shellRaw && String(shellRaw).trim()) {
    keyMode = classifyStripeSecretKeyMode(shellRaw);
    effectiveSource = 'process_env';
  } else if (envLocalFile.raw) {
    keyMode = classifyStripeSecretKeyMode(envLocalFile.raw);
    effectiveSource = 'env_local';
  } else if (envFile.raw) {
    keyMode = classifyStripeSecretKeyMode(envFile.raw);
    effectiveSource = 'env';
  } else if (fileRaw) {
    keyMode = classifyStripeSecretKeyMode(fileRaw);
    effectiveSource = 'file';
  }

  const distinctTestKeys = new Set(testCandidates.map((c) => c.key));
  const distinctModes = new Set(candidates.map((c) => c.mode));
  const ambiguous =
    distinctTestKeys.size > 1 ||
    (candidates.length > 1 &&
      distinctModes.size > 1 &&
      !testCandidates.length &&
      candidates.some((c) => c.mode === 'live_blocked'));

  if (ambiguous && testCandidates.length === 1) {
    effectiveKey = testCandidates[0].key;
    effectiveSource = testCandidates[0].source;
    keyMode = testCandidates[0].mode;
  } else if (ambiguous && !effectiveKey) {
    effectiveSource = 'ambiguous';
    keyMode = 'ambiguous';
  } else if (ambiguous && effectiveKey && !testModes.has(keyMode)) {
    const fallback = testCandidates[0];
    if (fallback) {
      effectiveKey = fallback.key;
      effectiveSource = fallback.source;
      keyMode = fallback.mode;
    } else {
      effectiveSource = 'ambiguous';
    }
  }

  const keyPresent = Boolean(effectiveKey) || keyMode === 'live_blocked' || keyMode === 'placeholder' || keyMode === 'malformed';
  const prefixTest = keyMode === 'test_secret' || keyMode === 'test_restricted';
  const quoted =
    shellQuoted ||
    (envLocalFile.raw ? stripeSecretRawWasQuoted(envLocalFile.raw) : false) ||
    (envFile.raw ? stripeSecretRawWasQuoted(envFile.raw) : false);

  let rootCauseCode = 'ok';
  if (keyMode === 'missing') rootCauseCode = 'stripe_key_missing';
  else if (keyMode === 'live_blocked') rootCauseCode = 'stripe_key_not_test';
  else if (keyMode === 'placeholder') rootCauseCode = 'stripe_key_placeholder';
  else if (keyMode === 'malformed') rootCauseCode = 'stripe_key_malformed';
  else if (keyMode === 'ambiguous') rootCauseCode = 'stripe_key_ambiguous';
  else if (!prefixTest) rootCauseCode = 'stripe_key_not_test';

  return {
    effectiveKey,
    effectiveSource,
    keyMode,
    keyPresent,
    prefixTest,
    quoted,
    duplicateCount,
    ambiguous,
    rootCauseCode,
    shellHadValue: shellRaw !== null && String(shellRaw).trim().length > 0,
    envLocalHadAssignment: envLocalFile.present,
    envHadAssignment: envFile.present,
    fileHadValue: Boolean(fileRaw && String(fileRaw).trim()),
  };
}

/**
 * Apply resolved test key to process.env for Stripe SDK (operator CLI only).
 * @param {ReturnType<typeof resolveL11OperatorStripeKey>} resolution
 */
export function applyL11StripeKeyToProcessEnv(resolution) {
  if (
    resolution.effectiveKey &&
    (resolution.keyMode === 'test_secret' || resolution.keyMode === 'test_restricted')
  ) {
    process.env.STRIPE_SECRET_KEY = resolution.effectiveKey;
  }
}

/**
 * @param {ReturnType<typeof resolveL11OperatorStripeKey>} resolution
 */
export function printL11StripeKeyDiagnosticLines(resolution) {
  const sourceEnum =
    resolution.effectiveSource === 'process_env'
      ? 'process_env'
      : resolution.effectiveSource === 'env_local'
        ? 'env_local'
        : resolution.effectiveSource === 'env'
          ? 'env'
          : resolution.effectiveSource === 'file'
            ? 'file'
            : resolution.effectiveSource === 'ambiguous'
              ? 'ambiguous'
              : 'missing';

  return [
    ['STRIPE_SECRET_SOURCE', sourceEnum],
    ['STRIPE_SECRET_KEY_PRESENT', resolution.keyPresent ? 'true' : 'false'],
    ['STRIPE_SECRET_KEY_MODE', resolution.keyMode],
    ['STRIPE_SECRET_KEY_PREFIX_TEST', resolution.prefixTest ? 'true' : 'false'],
    ['STRIPE_SECRET_KEY_QUOTED', resolution.quoted ? 'true' : 'false'],
    ['STRIPE_SECRET_KEY_DUPLICATE_COUNT', String(resolution.duplicateCount)],
    ['STRIPE_SECRET_KEY_EFFECTIVE_SOURCE', resolution.effectiveSource],
    ['STRIPE_SECRET_SHELL_HAD_VALUE', resolution.shellHadValue ? 'true' : 'false'],
    ['STRIPE_SECRET_ENV_LOCAL_HAD_ASSIGNMENT', resolution.envLocalHadAssignment ? 'true' : 'false'],
    ['STRIPE_SECRET_ENV_HAD_ASSIGNMENT', resolution.envHadAssignment ? 'true' : 'false'],
    ['STRIPE_SECRET_FILE_HAD_VALUE', resolution.fileHadValue ? 'true' : 'false'],
    ['ROOT_CAUSE_CODE', resolution.rootCauseCode],
  ];
}
