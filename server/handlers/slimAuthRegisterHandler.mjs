/**
 * Vercel serverless fast path for POST /api/auth/register: user create + token issue
 * without bootstrap.js (Redis rate-limit init) or full Express import graph.
 */
import { ZodError } from 'zod';

import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { env } from '../src/config/env.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { HttpError } from '../src/lib/httpError.js';
import {
  isOwnerOnlyEnforced,
  normalizeOwnerEmail,
  ownerEmailMatchesAllowed,
  ownerOnlyDeniedBody,
} from '../src/middleware/ownerOnlyAccessGuard.js';
import { PRELAUNCH_MONEY_BODY } from '../src/middleware/prelaunchMoneyBlock.js';
import { registerUser } from '../src/services/authService.js';
import { registerBodySchema } from '../src/validators/auth.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';
import { readBoundedWebhookBody, WEBHOOK_RAW_BODY_LIMIT_BYTES } from './slimStripeWebhookHandler.mjs';

/** Upper bound for register JSON body (well below webhook cap). */
export const AUTH_REGISTER_BODY_LIMIT_BYTES = 8 * 1024;

/** Wall clock for Prisma + bcrypt + token issue on serverless. */
export const AUTH_REGISTER_HANDLER_TIMEOUT_MS = 25_000;

/**
 * @param {'auth_register_slim_entry' | 'auth_register_slim_success' | 'auth_register_slim_denied' | 'auth_register_slim_error'} event
 * @param {Record<string, unknown>} [extra]
 */
function logAuthRegisterSlimBreadcrumb(event, extra = {}) {
  console.log(
    JSON.stringify({
      event,
      schema: 'zora.auth_register_slim.v1',
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
 * Mirrors `blockPublicRegistrationIfPrelaunch` on the Express register route.
 * @param {Record<string, unknown>} body
 * @returns {boolean}
 */
function prelaunchBlocksRegister(body) {
  if (!env.prelaunchLockdown) return false;
  if (env.prelaunchAllowPublicRegistration) return false;
  if (isOwnerOnlyEnforced()) {
    const email = normalizeOwnerEmail(body?.email);
    if (email && ownerEmailMatchesAllowed(email)) return false;
  }
  return true;
}

/**
 * @param {unknown} err
 * @returns {{ status: number, body: Record<string, unknown> }}
 */
function mapRegisterErrorToResponse(err) {
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
  if (err && typeof err === 'object' && err.code === 'AUTH_REGISTER_TIMEOUT') {
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
      const e = new Error('auth_register_handler_timeout');
      e.code = 'AUTH_REGISTER_TIMEOUT';
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
export async function handleSlimAuthRegisterPost(req, res) {
  logAuthRegisterSlimBreadcrumb('auth_register_slim_entry');

  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!contentTypeIsJson(req)) {
    logAuthRegisterSlimBreadcrumb('auth_register_slim_denied', {
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

  let rawBody;
  try {
    rawBody = await readBoundedWebhookBody(req, AUTH_REGISTER_BODY_LIMIT_BYTES);
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
    logAuthRegisterSlimBreadcrumb('auth_register_slim_denied', {
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

  if (prelaunchBlocksRegister(body)) {
    logAuthRegisterSlimBreadcrumb('auth_register_slim_denied', {
      reason: 'prelaunch_lockdown',
    });
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(PRELAUNCH_MONEY_BODY));
    return;
  }

  if (isOwnerOnlyEnforced()) {
    const email = normalizeOwnerEmail(body?.email);
    if (!email || !ownerEmailMatchesAllowed(email)) {
      logAuthRegisterSlimBreadcrumb('auth_register_slim_denied', {
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
    parsed = registerBodySchema.parse(body);
  } catch (e) {
    const mapped = mapRegisterErrorToResponse(e);
    logAuthRegisterSlimBreadcrumb('auth_register_slim_denied', {
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
    const registerFn =
      typeof globalThis.__zwSlimAuthRegisterUserImpl === 'function'
        ? globalThis.__zwSlimAuthRegisterUserImpl
        : registerUser;
    const out = await withTimeout(
      registerFn(parsed),
      AUTH_REGISTER_HANDLER_TIMEOUT_MS,
    );
    logAuthRegisterSlimBreadcrumb('auth_register_slim_success', {
      emailSuffix: String(parsed.email).slice(-12),
      hasAccessToken: Boolean(out?.accessToken),
      emailVerified: Boolean(out?.user?.emailVerified),
    });
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(out));
  } catch (err) {
    const mapped = mapRegisterErrorToResponse(err);
    logAuthRegisterSlimBreadcrumb('auth_register_slim_denied', {
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
