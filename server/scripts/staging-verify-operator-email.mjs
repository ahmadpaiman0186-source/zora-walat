#!/usr/bin/env node
/**
 * Path B: set emailVerifiedAt for STAGING_OPERATOR_EMAIL only (reversible).
 *
 * Local Prisma mode (often fails — `vercel env run` injects a short/non-usable DATABASE_URL):
 *   STAGING_ALLOW_OPERATOR_EMAIL_VERIFY=true
 *   STAGING_OPERATOR_EMAIL=...
 *   vercel env run --environment production -- node scripts/staging-verify-operator-email.mjs
 *
 * Remote Vercel DB mode (recommended):
 *   STAGING_OPERATOR_VERIFY_USE_REMOTE=true
 *   STAGING_OPERATOR_VERIFY_TOKEN=<matches Vercel STAGING_OPERATOR_VERIFY_TOKEN>
 *   STAGING_OPERATOR_EMAIL=...
 *   node scripts/staging-verify-operator-email.mjs
 *
 * Vercel production env required for remote mode (names only — set in dashboard):
 *   STAGING_ALLOW_OPERATOR_EMAIL_VERIFY, STAGING_OPERATOR_EMAIL, STAGING_OPERATOR_VERIFY_TOKEN
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const STAGING_API_BASE =
  String(process.env.STAGING_API_BASE ?? '').trim() ||
  'https://zora-walat-api-staging.vercel.app';

/** Real Neon/Vercel URLs are typically much longer than placeholder CLI values. */
const MIN_USABLE_DATABASE_URL_LENGTH = 80;

function safeLine(key, value) {
  process.stdout.write(`${key} ${value}\n`);
}

function emailHash(email) {
  return createHash('sha256').update(email).digest('hex').slice(0, 16);
}

function loadStagingDatabaseUrlFromFile() {
  const filePath = String(process.env.STAGING_DATABASE_URL_FILE ?? '').trim();
  if (!filePath) return;
  let raw = '';
  try {
    raw = readFileSync(filePath, 'utf8').trim();
  } catch {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('REASON staging_database_url_file_unreadable');
    process.exit(2);
  }
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
  if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
  if (!raw) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('REASON staging_database_url_file_empty');
    process.exit(2);
  }
  process.env.DATABASE_URL = raw;
}

async function runRemoteVerify(operatorEmail, clearMode) {
  const token = String(process.env.STAGING_OPERATOR_VERIFY_TOKEN ?? '').trim();
  if (!token) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('DATABASE_URL_LOADED false');
    safeLine('PRISMA_CONNECT_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON staging_operator_verify_token_missing');
    process.exitCode = 2;
    return;
  }

  const url = `${STAGING_API_BASE.replace(/\/+$/, '')}/api/ops/staging-verify-operator-email`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Staging-Operator-Verify-Token': token,
    },
    body: JSON.stringify({ email: operatorEmail }),
  });

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  const ok = Boolean(json.operatorVerifyEmailOk);
  safeLine('OPERATOR_VERIFY_EMAIL_OK', ok ? 'true' : 'false');
  safeLine(
    'DATABASE_URL_LOADED',
    json.databaseUrlLoaded === true ? 'true' : 'false',
  );
  safeLine('PRISMA_CONNECT_OK', json.prismaConnectOk === true ? 'true' : 'false');
  safeLine(
    'OPERATOR_EMAIL_ROW_FOUND',
    json.operatorEmailRowFound === true ? 'true' : 'false',
  );
  safeLine(
    'EMAIL_VERIFIED_SET',
    json.emailVerifiedSet === true ? 'true' : 'false',
  );
  if (json.reason) safeLine('REASON', String(json.reason));
  if (json.emailHash) safeLine('EMAIL_HASH', String(json.emailHash));
  if (!ok) process.exitCode = res.status >= 400 ? 2 : 1;
  if (clearMode) {
    safeLine('REASON remote_mode_clear_not_supported_use_local_clear');
  }
}

async function runLocalVerify(operatorEmail, clearMode) {
  process.env.NODE_ENV = 'production';

  loadStagingDatabaseUrlFromFile();

  const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
  const dbLoaded = dbUrl.length > 0;
  safeLine('DATABASE_URL_LOADED', dbLoaded ? 'true' : 'false');

  if (!dbLoaded) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('PRISMA_CONNECT_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON database_url_not_configured');
    safeLine('HINT set STAGING_OPERATOR_VERIFY_USE_REMOTE=true');
    process.exitCode = 2;
    return;
  }

  if (dbUrl.length < MIN_USABLE_DATABASE_URL_LENGTH) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('PRISMA_CONNECT_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON database_url_likely_placeholder');
    safeLine('HINT set STAGING_OPERATOR_VERIFY_USE_REMOTE=true');
    process.exitCode = 2;
    return;
  }

  const { prisma } = await import('../src/db.js');
  const { env } = await import('../src/config/env.js');

  let connectOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    connectOk = true;
  } catch {
    connectOk = false;
  }
  safeLine('PRISMA_CONNECT_OK', connectOk ? 'true' : 'false');

  if (!connectOk) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON database_connection_failed');
    safeLine('HINT set STAGING_OPERATOR_VERIFY_USE_REMOTE=true');
    process.exitCode = 2;
    await prisma.$disconnect().catch(() => {});
    return;
  }

  if (env.ownerAllowedEmail && operatorEmail !== env.ownerAllowedEmail) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON owner_allowed_email_mismatch');
    process.exitCode = 2;
    await prisma.$disconnect();
    return;
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: operatorEmail },
      select: { id: true, isActive: true, emailVerifiedAt: true },
    });
  } catch {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON database_query_failed');
    process.exitCode = 2;
    await prisma.$disconnect().catch(() => {});
    return;
  }

  if (!user || !user.isActive) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK false');
    safeLine('OPERATOR_EMAIL_ROW_FOUND false');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('REASON user_missing_or_inactive');
    safeLine(`EMAIL_HASH ${emailHash(operatorEmail)}`);
    process.exitCode = 2;
    await prisma.$disconnect();
    return;
  }

  safeLine('OPERATOR_EMAIL_ROW_FOUND true');

  if (clearMode) {
    if (!user.emailVerifiedAt) {
      safeLine('OPERATOR_VERIFY_EMAIL_OK true');
      safeLine('EMAIL_VERIFIED_SET false');
      safeLine('EMAIL_WAS_ALREADY_UNVERIFIED true');
      await prisma.$disconnect();
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: null },
    });
    safeLine('OPERATOR_VERIFY_EMAIL_OK true');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('EMAIL_VERIFIED_CLEARED true');
    await prisma.$disconnect();
    return;
  }

  if (user.emailVerifiedAt) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK true');
    safeLine('EMAIL_VERIFIED_SET false');
    safeLine('EMAIL_WAS_ALREADY_VERIFIED true');
    await prisma.$disconnect();
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  safeLine('OPERATOR_VERIFY_EMAIL_OK true');
  safeLine('EMAIL_VERIFIED_SET true');
  await prisma.$disconnect();
}

const clearMode = process.argv.includes('--clear');
const allow =
  String(process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY ?? '')
    .trim()
    .toLowerCase() === 'true';
const operatorEmail = String(process.env.STAGING_OPERATOR_EMAIL ?? '')
  .trim()
  .toLowerCase();
const useRemote =
  String(process.env.STAGING_OPERATOR_VERIFY_USE_REMOTE ?? '')
    .trim()
    .toLowerCase() === 'true';

if (!allow) {
  safeLine('OPERATOR_VERIFY_EMAIL_OK false');
  safeLine('REASON staging_gate_disabled');
  process.exit(2);
}

if (!operatorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) {
  safeLine('OPERATOR_VERIFY_EMAIL_OK false');
  safeLine('REASON invalid_or_missing_STAGING_OPERATOR_EMAIL');
  process.exit(2);
}

if (useRemote) {
  await runRemoteVerify(operatorEmail, clearMode);
} else {
  await runLocalVerify(operatorEmail, clearMode);
}
