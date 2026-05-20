/**
 * Vercel serverless fast path for POST /api/auth/request-otp (and resend-otp):
 * OTP challenge + email send without bootstrap.js or full Express import graph.
 */
import { ipKeyGenerator } from 'express-rate-limit';
import { ZodError } from 'zod';

import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { env } from '../src/config/env.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { HttpError } from '../src/lib/httpError.js';
import {
  isOwnerOnlyEnforced,
  normalizeOwnerEmail,
  ownerEmailMatchesAllowed,
  ownerOnlyDeniedBody,
} from '../src/middleware/ownerOnlyAccessGuard.js';
import { requestEmailOtp } from '../src/services/identity/otpChallengeService.js';
import { incrementSlidingWindow } from '../src/services/risk/riskSlidingWindow.js';
import { requestOtpBodySchema } from '../src/validators/auth.js';
import { sendOTP } from '../services/emailService.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';
import { readBoundedWebhookBody } from './slimStripeWebhookHandler.mjs';

/** Upper bound for request-otp JSON body. */
export const AUTH_REQUEST_OTP_BODY_LIMIT_BYTES = 4 * 1024;

/** Wall clock for Prisma + SMTP on serverless. */
export const AUTH_REQUEST_OTP_HANDLER_TIMEOUT_MS = 25_000;

/** Mirrors {@link otpRequestEndpointLimiter} when Redis store is not bootstrapped. */
const OTP_ENDPOINT_WINDOW_MS = 10 * 60 * 1000;
const OTP_ENDPOINT_MAX = env.nodeEnv === 'production' ? 10 : 30;

/**
 * @param {'auth_request_otp_slim_entry' | 'auth_request_otp_slim_success' | 'auth_request_otp_slim_denied' | 'auth_request_otp_slim_error'} event
 * @param {Record<string, unknown>} [extra]
 */
function logAuthRequestOtpSlimBreadcrumb(event, extra = {}) {
  console.log(
    JSON.stringify({
      event,
      schema: 'zora.auth_request_otp_slim.v1',
      t: new Date().toISOString(),
      ...extra,
    }),
  );
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function contentTypeIsJson(req) {
  const ct = req.headers['content-type'];
  if (!ct || typeof ct !== 'string') return false;
  const base = ct.split(';')[0].trim().toLowerCase();
  return base === 'application/json';
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function slimClientIpKey(req) {
  const xff = req.headers['x-forwarded-for'];
  let raw = '127.0.0.1';
  if (typeof xff === 'string' && xff.trim()) {
    raw = xff.split(',')[0].trim();
  } else if (req.socket?.remoteAddress) {
    raw = req.socket.remoteAddress;
  }
  const s = typeof raw === 'string' ? raw.replace(/^::ffff:/, '') : String(raw);
  return ipKeyGenerator(s);
}

/**
 * In-process endpoint cap (per instance) when express-rate-limit Redis is not initialized.
 * @param {string} ipKey
 * @returns {boolean} true if allowed
 */
function allowOtpEndpointRequest(ipKey) {
  const stat = incrementSlidingWindow(
    `auth_otp_req_endpoint_10m:${ipKey}`,
    OTP_ENDPOINT_WINDOW_MS,
  );
  return stat.count <= OTP_ENDPOINT_MAX;
}

/**
 * @param {unknown} err
 * @returns {{ status: number, body: Record<string, unknown> }}
 */
function mapRequestOtpErrorToResponse(err) {
  if (err instanceof HttpError) {
    const code =
      typeof err.code === 'string' && err.code.length > 0
        ? err.code
        : AUTH_ERROR_CODE.AUTH_INVALID_REQUEST;
    return {
      status: err.status,
      body: clientErrorBody(err.message, code),
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: clientErrorBody('Invalid request body', AUTH_ERROR_CODE.VALIDATION_ERROR),
    };
  }
  if (err && typeof err === 'object' && err.code === 'AUTH_REQUEST_OTP_TIMEOUT') {
    return {
      status: 503,
      body: clientErrorBody('Service unavailable', AUTH_ERROR_CODE.AUTH_INVALID_REQUEST),
    };
  }
  return {
    status: 500,
    body: clientErrorBody('Service unavailable', AUTH_ERROR_CODE.AUTH_INVALID_REQUEST),
  };
}

/**
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 * @template T
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error('auth_request_otp_handler_timeout');
      e.code = 'AUTH_REQUEST_OTP_TIMEOUT';
      reject(e);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleSlimAuthRequestOtpPost(req, res) {
  logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_entry');

  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!contentTypeIsJson(req)) {
    logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_denied', {
      reason: 'content_type',
    });
    res.statusCode = 415;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody(
          'Content-Type must be application/json',
          API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE,
        ),
      ),
    );
    return;
  }

  const ipKey = slimClientIpKey(req);
  if (!allowOtpEndpointRequest(ipKey)) {
    logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_denied', {
      reason: 'endpoint_rate_limit',
    });
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody(
          'Too many OTP requests; try again later.',
          RISK_REASON_CODE.RATE_LIMITED,
        ),
      ),
    );
    return;
  }

  let rawBody;
  try {
    rawBody = await readBoundedWebhookBody(req, AUTH_REQUEST_OTP_BODY_LIMIT_BYTES);
  } catch (e) {
    if (e && typeof e === 'object' && e.code === 'WEBHOOK_BODY_TOO_LARGE') {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify(
          clientErrorBody('Payload too large', AUTH_ERROR_CODE.VALIDATION_ERROR),
        ),
      );
      return;
    }
    throw e;
  }

  let body;
  try {
    body = rawBody.length === 0 ? {} : JSON.parse(rawBody.toString('utf8'));
  } catch {
    logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_denied', {
      reason: 'json_parse',
    });
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Invalid JSON body', API_CONTRACT_CODE.INVALID_JSON_BODY),
      ),
    );
    return;
  }

  if (isOwnerOnlyEnforced()) {
    const email = normalizeOwnerEmail(body?.email);
    if (!email || !ownerEmailMatchesAllowed(email)) {
      logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_denied', {
        reason: 'owner_only',
        emailSuffix: email ? email.slice(-12) : null,
      });
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(ownerOnlyDeniedBody()));
      return;
    }
  }

  let parsed;
  try {
    parsed = requestOtpBodySchema.parse(body);
  } catch (e) {
    const mapped = mapRequestOtpErrorToResponse(e);
    logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_denied', {
      reason: 'validation',
      httpStatus: mapped.status,
    });
    res.statusCode = mapped.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(mapped.body));
    return;
  }

  try {
    const requestFn =
      typeof globalThis.__zwSlimAuthRequestEmailOtpImpl === 'function'
        ? globalThis.__zwSlimAuthRequestEmailOtpImpl
        : requestEmailOtp;
    const out = await withTimeout(
      requestFn(parsed, {
        sendOtp: sendOTP,
        clientIpKey: ipKey,
      }),
      AUTH_REQUEST_OTP_HANDLER_TIMEOUT_MS,
    );
    logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_success', {
      emailSuffix: String(parsed.email).slice(-12),
      ok: Boolean(out?.ok),
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(out));
  } catch (err) {
    const mapped = mapRequestOtpErrorToResponse(err);
    logAuthRequestOtpSlimBreadcrumb('auth_request_otp_slim_denied', {
      reason: err instanceof HttpError ? 'http_error' : 'error',
      httpStatus: mapped.status,
      code:
        err instanceof HttpError && typeof err.code === 'string'
          ? err.code
          : undefined,
    });
    res.statusCode = mapped.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(mapped.body));
  }
}
