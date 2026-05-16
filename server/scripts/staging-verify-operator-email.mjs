#!/usr/bin/env node
/**
 * Staging operator-only: set User.emailVerifiedAt for the test account (reversible).
 *
 * Safety gates (all required):
 *   STAGING_ALLOW_OPERATOR_EMAIL_VERIFY=true
 *   STAGING_OPERATOR_EMAIL=<operator test inbox>
 *   If OWNER_ALLOWED_EMAIL is set, it must match STAGING_OPERATOR_EMAIL.
 *
 * Does not print DATABASE_URL, OTP codes, or secrets.
 *
 * Revert: STAGING_ALLOW_OPERATOR_EMAIL_VERIFY=true node scripts/staging-verify-operator-email.mjs --clear
 */
import '../bootstrap.js';
import { createHash } from 'node:crypto';

import { prisma } from '../src/db.js';
import { env } from '../src/config/env.js';

function safeLine(line) {
  process.stdout.write(`${line}\n`);
}

function emailHash(email) {
  return createHash('sha256').update(email).digest('hex').slice(0, 16);
}

const clearMode = process.argv.includes('--clear');
const allow = String(process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY ?? '')
  .trim()
  .toLowerCase();
const operatorEmail = String(process.env.STAGING_OPERATOR_EMAIL ?? '')
  .trim()
  .toLowerCase();

if (allow !== 'true') {
  safeLine('OPERATOR_VERIFY_EMAIL_OK false');
  safeLine('REASON staging_gate_disabled');
  safeLine('HINT set STAGING_ALLOW_OPERATOR_EMAIL_VERIFY=true in local shell only');
  process.exitCode = 2;
  process.exit();
}

if (!operatorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) {
  safeLine('OPERATOR_VERIFY_EMAIL_OK false');
  safeLine('REASON invalid_or_missing_STAGING_OPERATOR_EMAIL');
  process.exitCode = 2;
  process.exit();
}

if (env.ownerAllowedEmail && operatorEmail !== env.ownerAllowedEmail) {
  safeLine('OPERATOR_VERIFY_EMAIL_OK false');
  safeLine('REASON owner_allowed_email_mismatch');
  process.exitCode = 2;
  process.exit();
}

const user = await prisma.user.findUnique({
  where: { email: operatorEmail },
  select: { id: true, email: true, isActive: true, emailVerifiedAt: true },
});

if (!user || !user.isActive) {
  safeLine('OPERATOR_VERIFY_EMAIL_OK false');
  safeLine('REASON user_missing_or_inactive');
  safeLine(`EMAIL_HASH ${emailHash(operatorEmail)}`);
  process.exitCode = 2;
  await prisma.$disconnect();
  process.exit();
}

if (clearMode) {
  if (!user.emailVerifiedAt) {
    safeLine('OPERATOR_VERIFY_EMAIL_OK true');
    safeLine('EMAIL_WAS_ALREADY_UNVERIFIED true');
    safeLine(`EMAIL_HASH ${emailHash(operatorEmail)}`);
    await prisma.$disconnect();
    process.exit(0);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: null },
  });
  safeLine('OPERATOR_VERIFY_EMAIL_OK true');
  safeLine('EMAIL_VERIFIED_CLEARED true');
  safeLine(`EMAIL_HASH ${emailHash(operatorEmail)}`);
  await prisma.$disconnect();
  process.exit(0);
}

if (user.emailVerifiedAt) {
  safeLine('OPERATOR_VERIFY_EMAIL_OK true');
  safeLine('EMAIL_WAS_ALREADY_VERIFIED true');
  safeLine(`EMAIL_HASH ${emailHash(operatorEmail)}`);
  await prisma.$disconnect();
  process.exit(0);
}

const verifiedAt = new Date();
await prisma.user.update({
  where: { id: user.id },
  data: { emailVerifiedAt: verifiedAt },
});

safeLine('OPERATOR_VERIFY_EMAIL_OK true');
safeLine('EMAIL_WAS_ALREADY_VERIFIED false');
safeLine('EMAIL_VERIFIED_SET true');
safeLine(`EMAIL_HASH ${emailHash(operatorEmail)}`);
await prisma.$disconnect();
