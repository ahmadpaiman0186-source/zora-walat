/**
 * Vercel-only fast path: set emailVerifiedAt for STAGING_OPERATOR_EMAIL (Path B).
 * Requires platform env (set in Vercel dashboard only):
 *   STAGING_ALLOW_OPERATOR_EMAIL_VERIFY=true
 *   STAGING_OPERATOR_EMAIL=<operator test inbox>
 *   STAGING_OPERATOR_VERIFY_TOKEN=<long random secret> (required in production)
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import { z } from 'zod';

import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { normalizeOwnerEmail } from '../src/middleware/ownerOnlyAccessGuard.js';
import { readBoundedWebhookBody } from './slimStripeWebhookHandler.mjs';

export const STAGING_OPERATOR_VERIFY_BODY_LIMIT_BYTES = 2 * 1024;

const bodySchema = z
  .object({
    email: z.string().email().max(254),
  })
  .strict();

function safeJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function emailHash(email) {
  return createHash('sha256').update(normalizeOwnerEmail(email)).digest('hex').slice(0, 16);
}

function gateEnabled() {
  return (
    String(process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function configuredOperatorEmail() {
  return normalizeOwnerEmail(process.env.STAGING_OPERATOR_EMAIL ?? '');
}

function verifyTokenOk(req) {
  const expected = String(process.env.STAGING_OPERATOR_VERIFY_TOKEN ?? '').trim();
  if (!expected || expected.length < 16) return false;
  const hdr = req.headers['x-staging-operator-verify-token'];
  const got = typeof hdr === 'string' ? hdr.trim() : '';
  if (!got) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(got, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSlimStagingOperatorVerifyEmailPost(req, res) {
  if (!gateEnabled()) {
    safeJson(res, 503, {
      operatorVerifyEmailOk: false,
      reason: 'staging_operator_verify_disabled',
    });
    return;
  }

  if (!verifyTokenOk(req)) {
    safeJson(res, 401, {
      operatorVerifyEmailOk: false,
      reason: 'staging_operator_verify_unauthorized',
    });
    return;
  }

  const ct = req.headers['content-type'];
  if (!ct || !String(ct).toLowerCase().includes('application/json')) {
    safeJson(res, 415, {
      operatorVerifyEmailOk: false,
      reason: API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE,
    });
    return;
  }

  let rawBody;
  try {
    rawBody = await readBoundedWebhookBody(req, STAGING_OPERATOR_VERIFY_BODY_LIMIT_BYTES);
  } catch {
    safeJson(res, 400, { operatorVerifyEmailOk: false, reason: 'payload_too_large' });
    return;
  }

  let body;
  try {
    body = rawBody.length === 0 ? {} : JSON.parse(rawBody.toString('utf8'));
  } catch {
    safeJson(res, 400, {
      operatorVerifyEmailOk: false,
      reason: API_CONTRACT_CODE.INVALID_JSON_BODY,
    });
    return;
  }

  let parsed;
  try {
    parsed = bodySchema.parse(body);
  } catch (e) {
    safeJson(res, 400, {
      operatorVerifyEmailOk: false,
      reason:
        e instanceof ZodError
          ? API_CONTRACT_CODE.VALIDATION_ERROR
          : 'validation_error',
    });
    return;
  }

  const target = normalizeOwnerEmail(parsed.email);
  const allowed = configuredOperatorEmail();
  if (!allowed || target !== allowed) {
    safeJson(res, 403, {
      operatorVerifyEmailOk: false,
      reason: 'staging_operator_email_mismatch',
    });
    return;
  }

  const { prisma } = await import('../src/db.js');
  const findUser =
    typeof globalThis.__zwStagingOperatorVerifyFindUserImpl === 'function'
      ? globalThis.__zwStagingOperatorVerifyFindUserImpl
      : (email) =>
          prisma.user.findUnique({
            where: { email },
            select: { id: true, isActive: true, emailVerifiedAt: true },
          });
  const updateUser =
    typeof globalThis.__zwStagingOperatorVerifyUpdateUserImpl === 'function'
      ? globalThis.__zwStagingOperatorVerifyUpdateUserImpl
      : (args) => prisma.user.update(args);

  let user;
  try {
    user = await findUser(target);
  } catch {
    safeJson(res, 503, {
      operatorVerifyEmailOk: false,
      reason: 'database_connection_failed',
      emailHash: emailHash(target),
    });
    return;
  }

  if (!user || !user.isActive) {
    safeJson(res, 404, {
      operatorVerifyEmailOk: false,
      operatorEmailRowFound: false,
      reason: 'user_missing_or_inactive',
      emailHash: emailHash(target),
    });
    return;
  }

  if (user.emailVerifiedAt) {
    safeJson(res, 200, {
      operatorVerifyEmailOk: true,
      databaseUrlLoaded: true,
      prismaConnectOk: true,
      operatorEmailRowFound: true,
      emailVerifiedSet: false,
      emailWasAlreadyVerified: true,
      emailHash: emailHash(target),
    });
    return;
  }

  await updateUser({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  safeJson(res, 200, {
    operatorVerifyEmailOk: true,
    databaseUrlLoaded: true,
    prismaConnectOk: true,
    operatorEmailRowFound: true,
    emailVerifiedSet: true,
    emailWasAlreadyVerified: false,
    emailHash: emailHash(target),
  });
}
