/**
 * Vercel serverless fast path for POST /api/auth/login: credential check + token issue
 * without bootstrap.js (Redis rate-limit init) or full Express import graph.
 */
import { ZodError } from 'zod';

import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { HttpError } from '../src/lib/httpError.js';
import {
  isOwnerOnlyEnforced,
  normalizeOwnerEmail,
  ownerEmailMatchesAllowed,
  ownerOnlyDeniedBody,
} from '../src/middleware/ownerOnlyAccessGuard.js';
import { loginUser } from '../src/services/authService.js';
import { loginBodySchema } from '../src/validators/auth.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';
import { readBoundedWebhookBody, WEBHOOK_RAW_BODY_LIMIT_BYTES } from './slimStripeWebhookHandler.mjs';

/** Upper bound for login JSON body (well below webhook cap). */
export const AUTH_LOGIN_BODY_LIMIT_BYTES = 8 * 1024;

/** Wall clock for Prisma + bcrypt + token issue on serverless. */
export const AUTH_LOGIN_HANDLER_TIMEOUT_MS = 20_000;

/**
 * @param {'auth_slim_entry' | 'auth_slim_success' | 'auth_slim_denied' | 'auth_slim_error'} event
 * @param {Record<string, unknown>} [extra]
 */
function logAuthSlimBreadcrumb(event, extra = {}) {
  console.log(
    JSON.stringify({
      event,
      schema: 'zora.auth_slim.v1',
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
 * @param {unknown} err
 * @returns {{ status: number, body: Record<string, unknown> }}
 */
function mapLoginErrorToResponse(err) {
  if (err instanceof HttpError) {
    const code =
      typeof err.code === 'string' && err.code.length > 0
        ? err.code
        : AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS;
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
  if (err && typeof err === 'object' && err.code === 'AUTH_LOGIN_TIMEOUT') {
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
      const e = new Error('auth_login_handler_timeout');
      e.code = 'AUTH_LOGIN_TIMEOUT';
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
export async function handleSlimAuthLoginPost(req, res) {
  logAuthSlimBreadcrumb('auth_slim_entry');

  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!contentTypeIsJson(req)) {
    logAuthSlimBreadcrumb('auth_slim_denied', { reason: 'content_type' });
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Invalid request body', AUTH_ERROR_CODE.VALIDATION_ERROR),
      ),
    );
    return;
  }

  let rawBody;
  try {
    rawBody = await readBoundedWebhookBody(req, AUTH_LOGIN_BODY_LIMIT_BYTES);
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
    logAuthSlimBreadcrumb('auth_slim_denied', { reason: 'json_parse' });
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Invalid request body', AUTH_ERROR_CODE.VALIDATION_ERROR),
      ),
    );
    return;
  }

  if (isOwnerOnlyEnforced()) {
    const email = normalizeOwnerEmail(body?.email);
    if (!email || !ownerEmailMatchesAllowed(email)) {
      logAuthSlimBreadcrumb('auth_slim_denied', {
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
    parsed = loginBodySchema.parse(body);
  } catch (e) {
    const mapped = mapLoginErrorToResponse(e);
    logAuthSlimBreadcrumb('auth_slim_denied', {
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
    const out = await withTimeout(
      loginUser(parsed),
      AUTH_LOGIN_HANDLER_TIMEOUT_MS,
    );
    logAuthSlimBreadcrumb('auth_slim_success', {
      emailSuffix: String(parsed.email).slice(-12),
      hasAccessToken: Boolean(out?.accessToken),
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(out));
  } catch (err) {
    const mapped = mapLoginErrorToResponse(err);
    logAuthSlimBreadcrumb('auth_slim_denied', {
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
