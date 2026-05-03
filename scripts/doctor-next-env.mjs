#!/usr/bin/env node
/**
 * Fail-fast diagnostics for Next.js public Stripe publishable key at repo root.
 * Never prints full secrets — masked previews only.
 *
 * Usage:
 *   node scripts/doctor-next-env.mjs
 *   node scripts/doctor-next-env.mjs --repair   # copy pk_ line from server/.env.local → root .env.local
 *   node scripts/doctor-next-env.mjs --repair-api-url   # append NEXT_PUBLIC_API_URL if missing
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_URL_KEY,
  STRIPE_PK_KEY,
  ensureRootPublicApiUrl,
  keyLooksSecret,
  maskPublishableKey,
  readEnvFile as readEnvShared,
  isStructurallyValidPublishableKey,
} from './aes-internal.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const KEY = STRIPE_PK_KEY;

/** @param {string} relativePath */
function readEnvFile(relativePath) {
  const shared = readEnvShared(relativePath);
  const text =
    shared.exists && existsSync(shared.path)
      ? readFileSync(shared.path, 'utf8')
      : '';
  return { ...shared, text };
}

/** @param {string} value */
function analyzeValueIssues(value) {
  /** @type {string[]} */
  const issues = [];
  if (!value) return issues;
  if (/\s/.test(value)) issues.push('contains_whitespace');
  if (/["'`;]/.test(value)) issues.push('suspicious_quote_or_semicolon');
  if (/[^\x20-\x7E]/.test(value)) issues.push('non_ascii_or_control');
  return issues;
}

/** @param {Record<string, string>} parsed */
function summarizeBackendEnv(parsed) {
  /** @type {string[]} */
  const secretKeyNames = [];
  /** @type {string[]} */
  const otherKeyNames = [];
  for (const k of Object.keys(parsed)) {
    if (k.startsWith('NEXT_PUBLIC_')) continue;
    if (keyLooksSecret(k)) secretKeyNames.push(k);
    else otherKeyNames.push(k);
  }
  return {
    secretKeyNamesPresent: secretKeyNames.sort(),
    otherBackendKeyNames: otherKeyNames.sort(),
    note: 'Values for secret keys are never printed.',
  };
}

/** @param {Record<string, string>} parsed */
function summarizeFrontendPublic(parsed) {
  const pk = parsed[KEY] ?? '';
  const api =
    String(parsed[NEXT_PUBLIC_API_URL_KEY] ?? '').trim() || null;
  return {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_masked: maskPublishableKey(pk),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_valid:
      isStructurallyValidPublishableKey(pk),
    NEXT_PUBLIC_API_URL: api,
    NEXT_PUBLIC_API_URL_configured: Boolean(api),
  };
}

function main() {
  const repair = process.argv.includes('--repair');
  const repairApiUrl = process.argv.includes('--repair-api-url');

  let rootEnvLocal = readEnvFile('.env.local');
  const rootEnv = readEnvFile('.env');
  let serverEnvLocal = readEnvFile(join('server', '.env.local'));

  let rootPk = rootEnvLocal.parsed[KEY] ?? '';
  let serverPk = serverEnvLocal.parsed[KEY] ?? '';

  let rootValid = isStructurallyValidPublishableKey(rootPk);
  const serverValid = isStructurallyValidPublishableKey(serverPk);

  if (repair) {
    if (rootValid) {
      console.log('[doctor-next-env] repair skipped — root key already valid.');
    } else if (!serverValid) {
      console.error(
        '[doctor-next-env] --repair aborted: no structurally valid publishable key in server/.env.local to copy.',
      );
      process.exit(1);
    } else {
      const line = `${KEY}=${serverPk}\n`;
      const header =
        '# Synced by scripts/doctor-next-env.mjs --repair (publishable key only; never copy secret keys here).\n';
      if (!rootEnvLocal.exists) {
        writeFileSync(join(repoRoot, '.env.local'), header + line, 'utf8');
        console.log(
          `[doctor-next-env] created ${join(repoRoot, '.env.local')} with ${KEY} only (masked ${maskPublishableKey(serverPk)}).`,
        );
      } else if (!rootPk.trim()) {
        appendFileSync(join(repoRoot, '.env.local'), `\n${header}${line}`, 'utf8');
        console.log(
          `[doctor-next-env] appended ${KEY} to existing .env.local (masked ${maskPublishableKey(serverPk)}).`,
        );
      } else {
        console.error(
          '[doctor-next-env] --repair: root .env.local exists and already has a value for this key — not overwriting. Fix manually or remove the bad line.',
        );
        process.exit(1);
      }
      rootEnvLocal = readEnvFile('.env.local');
      rootPk = rootEnvLocal.parsed[KEY] ?? '';
      rootValid = isStructurallyValidPublishableKey(rootPk);
    }
  }

  if (repairApiUrl) {
    const r = ensureRootPublicApiUrl();
    console.log(
      `[doctor-next-env] --repair-api-url: ${r.changed ? `appended ${NEXT_PUBLIC_API_URL_KEY}=${DEFAULT_PUBLIC_API_URL}` : 'already set, skipped'}`,
    );
    rootEnvLocal = readEnvFile('.env.local');
    rootPk = rootEnvLocal.parsed[KEY] ?? '';
    rootValid = isStructurallyValidPublishableKey(rootPk);
  }

  const rootIssues = analyzeValueIssues(rootPk);
  serverEnvLocal = readEnvFile(join('server', '.env.local'));
  serverPk = serverEnvLocal.parsed[KEY] ?? '';
  const serverIssues = analyzeValueIssues(serverPk);

  const environmentLayers = {
    frontendRootDotEnvLocal: {
      path: join(repoRoot, '.env.local'),
      exists: rootEnvLocal.exists,
      publicPublishableKeys: summarizeFrontendPublic(rootEnvLocal.parsed),
    },
    backendServerDotEnvLocal: {
      path: join(repoRoot, 'server', '.env.local'),
      exists: serverEnvLocal.exists,
      ...summarizeBackendEnv(serverEnvLocal.parsed),
      misplacedNextPublicKeys: Object.keys(serverEnvLocal.parsed).filter((k) =>
        k.startsWith('NEXT_PUBLIC_'),
      ),
    },
    separationNote:
      'Frontend NEXT_PUBLIC_* must live in repo root .env.local for Next.js. Backend secrets belong in server/.env.local only.',
  };

  console.log(
    JSON.stringify(
      {
        repoRoot,
        environmentLayers,
        rootDotEnvLocalExists: rootEnvLocal.exists,
        rootDotEnvExists: rootEnv.exists,
        serverDotEnvLocalExists: serverEnvLocal.exists,
        keyName: KEY,
        rootKeyMasked: maskPublishableKey(rootPk),
        rootKeyStructurallyValid: rootValid,
        rootValueIssues: rootIssues,
        serverHasPublishableKey: serverValid || serverPk.length > 0,
        serverKeyMasked: serverPk ? maskPublishableKey(serverPk) : '(none)',
        serverKeyStructurallyValid: isStructurallyValidPublishableKey(serverPk),
        serverValueIssues: serverIssues,
        wrongLocationWarning:
          !rootValid && isStructurallyValidPublishableKey(serverPk)
            ? `NEXT_PUBLIC_* is defined under server/.env.local but Next.js only loads .env files from the repository root (next to package.json). Copy ${KEY} to ${join(repoRoot, '.env.local')} or run: npm run doctor:next-env -- --repair`
            : null,
      },
      null,
      2,
    ),
  );

  if (!rootValid) {
    if (!rootEnvLocal.exists) {
      console.error(
        `[doctor-next-env] FAIL: missing ${join(repoRoot, '.env.local')}. Next.js does not read server/.env.local for NEXT_PUBLIC_* — create root .env.local or run --repair if key exists in server/.env.local.`,
      );
    } else if (rootPk && !isStructurallyValidPublishableKey(rootPk)) {
      console.error(
        `[doctor-next-env] FAIL: ${KEY} is present but malformed (masked ${maskPublishableKey(rootPk)}). Must start with pk_test_ or pk_live_, ASCII, no spaces.`,
      );
    } else {
      console.error(
        `[doctor-next-env] FAIL: ${KEY} not set in root .env.local (masked preview shows empty).`,
      );
    }
    process.exit(1);
  }

  console.log('[doctor-next-env] PASS: root publishable key is structurally valid.');
  process.exit(0);
}

main();
