/**
 * Local-only: inspect user + AuthOtpChallenge + env for OTP debugging.
 * Does not print plaintext email (emailHash only). Stored hash is labeled as DB digest, not the OTP code.
 */
import '../bootstrap.js';
import { createHash } from 'node:crypto';
import { prisma } from '../src/db.js';

const raw = String(process.argv[2] ?? '').trim().toLowerCase();
if (!raw) {
  console.error('Usage: node scripts/probe-otp-user.mjs <email>');
  process.exit(1);
}

function emailHashForProbe(email) {
  return createHash('sha256').update(email).digest('hex').slice(0, 16);
}

const emailHash = emailHashForProbe(raw);

const u = await prisma.user.findUnique({
  where: { email: raw },
  select: { id: true, isActive: true, emailVerifiedAt: true },
});

const ch = await prisma.authOtpChallenge.findUnique({
  where: { email: raw },
  select: {
    id: true,
    expiresAt: true,
    resendAfter: true,
    requestCount: true,
    lastSentAt: true,
    consumedAt: true,
    lockedUntil: true,
    otpHash: true,
  },
});

const out = {
  emailHash,
  userExists: Boolean(u),
  isActive: u ? u.isActive : null,
  emailVerifiedAt: u?.emailVerifiedAt?.toISOString() ?? null,
  challenge: ch
    ? {
        id: ch.id,
        expiresAt: ch.expiresAt.toISOString(),
        resendAfter: ch.resendAfter.toISOString(),
        requestCount: ch.requestCount,
        lastSentAt: ch.lastSentAt.toISOString(),
        consumedAt: ch.consumedAt?.toISOString() ?? null,
        lockedUntil: ch.lockedUntil?.toISOString() ?? null,
        storedOtpCredentialHashDiagnostic:
          '(SHA-256 of email:otp in DB — not the plaintext OTP code)',
        otpHashSuffix: String(ch.otpHash ?? '').slice(-12),
      }
    : null,
  nowIso: new Date().toISOString(),
  nodeEnv: process.env.NODE_ENV ?? null,
  otpTransport: process.env.OTP_TRANSPORT ?? null,
};

console.log(JSON.stringify(out, null, 2));
await prisma.$disconnect();
