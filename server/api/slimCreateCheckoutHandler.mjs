/**
 * Vercel serverless fast path for POST /api/create-checkout-session:
 * JWT auth + hosted checkout orchestration without bootstrap.js / full Express cold start.
 */
import { randomUUID } from 'node:crypto';

import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { env } from '../src/config/env.js';
import { createCheckoutSession } from '../src/controllers/paymentController.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { HttpError } from '../src/lib/httpError.js';
import {
  isOwnerOnlyEnforced,
  ownerEmailMatchesAllowed,
  ownerOnlyDeniedBody,
} from '../src/middleware/ownerOnlyAccessGuard.js';
import {
  PAYMENTS_LOCKDOWN_BODY,
  PRELAUNCH_MONEY_BODY,
} from '../src/middleware/prelaunchMoneyBlock.js';
import { verifyAccessToken } from '../src/services/authTokenService.js';
import { loadUserForRequest } from '../src/services/authService.js';
import {
  assertMoneyPathIdentityAllowed,
  buildIdentityTrustContext,
} from '../src/security/identityTrustContext.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';
import { readBoundedWebhookBody } from './slimStripeWebhookHandler.mjs';

export const SLIM_CHECKOUT_BODY_LIMIT_BYTES = 16 * 1024;
export const SLIM_CHECKOUT_HANDLER_TIMEOUT_MS = 28_000;

const noopLog = {
  info() {},
  warn() {},
  error() {},
  child() {
    return noopLog;
  },
};

/**
 * @param {'checkout_slim_entry' | 'checkout_slim_success' | 'checkout_slim_denied' | 'checkout_slim_error'} event
 * @param {Record<string, unknown>} [extra]
 */
function logCheckoutSlimBreadcrumb(event, extra = {}) {
  console.log(
    JSON.stringify({
      event,
      schema: 'zora.checkout_slim.v1',
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
function clientIpFromReq(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  if (req.socket?.remoteAddress) {
    return String(req.socket.remoteAddress).replace(/^::ffff:/, '');
  }
  return '127.0.0.1';
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string | null}
 */
function bearerToken(req) {
  const h = req.headers?.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
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
      const e = new Error('checkout_slim_handler_timeout');
      e.code = 'CHECKOUT_SLIM_TIMEOUT';
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

function basicClientIntegrityOk(req) {
  if (!env.antiBotStrictHeaders) return true;
  const ua = String(req.headers['user-agent'] ?? '').trim();
  if (ua.length < 8) return false;
  const secSite = String(req.headers['sec-fetch-site'] ?? '')
    .trim()
    .toLowerCase();
  const secMode = String(req.headers['sec-fetch-mode'] ?? '')
    .trim()
    .toLowerCase();
  const zwClient = String(req.headers['x-zw-client'] ?? '').trim().toLowerCase();
  const browserLike =
    (secSite && ['same-origin', 'same-site', 'cross-site'].includes(secSite)) ||
    (secMode && ['cors', 'navigate', 'same-origin'].includes(secMode));
  return browserLike || zwClient.startsWith('zw-');
}

/**
 * @param {import('http').IncomingMessage} incomingReq
 * @param {Record<string, unknown>} body
 * @param {{ id: string, email: string, role: string, emailVerified: boolean }} user
 */
function buildExpressLikeReq(incomingReq, body, user) {
  const headers = incomingReq.headers ?? {};
  const get = (name) => {
    const key = String(name).toLowerCase();
    const raw = headers[key] ?? headers[name];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  return {
    method: 'POST',
    url: '/api/create-checkout-session',
    originalUrl: '/api/create-checkout-session',
    path: '/create-checkout-session',
    headers,
    body,
    user,
    ip: clientIpFromReq(incomingReq),
    get,
    identityAuthSource: 'jwt',
    traceId: randomUUID(),
    log: noopLog,
  };
}

/**
 * @param {import('http').ServerResponse} res
 */
function attachJsonCapture(res) {
  /** @type {Record<string, unknown> | null} */
  let captured = null;
  let statusCode = 200;
  const originalJson = res.json?.bind(res);
  const originalStatus = res.status?.bind(res);
  res.status = function status(code) {
    statusCode = code;
    if (typeof originalStatus === 'function') {
      return originalStatus(code);
    }
    res.statusCode = code;
    return res;
  };
  res.json = function json(body) {
    captured = body && typeof body === 'object' ? body : { value: body };
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
    return res;
  };
  return {
    getStatus: () => statusCode,
    getBody: () => captured,
  };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleSlimCreateCheckoutPost(req, res) {
  logCheckoutSlimBreadcrumb('checkout_slim_entry');

  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (env.prelaunchLockdown) {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'prelaunch_lockdown' });
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(PRELAUNCH_MONEY_BODY));
    return;
  }

  if (env.paymentsLockdownMode === true || env.paymentsLockdownMode === 'true') {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'payments_lockdown' });
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(PAYMENTS_LOCKDOWN_BODY));
    return;
  }

  if (!contentTypeIsJson(req)) {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'content_type' });
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

  const token = bearerToken(req);
  if (!token) {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'auth_required' });
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
      ),
    );
    return;
  }

  let authUser;
  try {
    if (typeof globalThis.__zwSlimCheckoutResolveUser === 'function') {
      const resolved = await globalThis.__zwSlimCheckoutResolveUser(req);
      if (!resolved) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify(
            clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
          ),
        );
        return;
      }
      authUser = resolved;
    } else {
    const payload = verifyAccessToken(token);
    const tv =
      typeof payload.tv === 'number'
        ? payload.tv
        : parseInt(String(payload.tv), 10);
    const user = await loadUserForRequest(payload.sub, tv);
    if (!user) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify(
          clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
        ),
      );
      return;
    }
    if (
      isOwnerOnlyEnforced() &&
      !ownerEmailMatchesAllowed(user.email)
    ) {
      logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'owner_only' });
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(ownerOnlyDeniedBody()));
      return;
    }
    authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
    }
  } catch {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'auth_invalid' });
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
      ),
    );
    return;
  }

  if (!authUser.emailVerified && !env.allowUnverifiedCheckoutInDev) {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'email_not_verified' });
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody(
          'Email verification is required for this action.',
          AUTH_ERROR_CODE.AUTH_VERIFICATION_REQUIRED,
        ),
      ),
    );
    return;
  }

  if (!basicClientIntegrityOk(req)) {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'client_integrity' });
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody(
          'Client integrity check failed. For web, use a modern browser; for apps send header X-ZW-Client: zw-flutter/1.',
          'client_integrity_required',
        ),
      ),
    );
    return;
  }

  let rawBody;
  try {
    rawBody = await readBoundedWebhookBody(req, SLIM_CHECKOUT_BODY_LIMIT_BYTES);
  } catch (e) {
    if (e && typeof e === 'object' && e.code === 'WEBHOOK_BODY_TOO_LARGE') {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify(
          clientErrorBody('Payload too large', API_CONTRACT_CODE.VALIDATION_ERROR),
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
    logCheckoutSlimBreadcrumb('checkout_slim_denied', { reason: 'json_parse' });
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

  const expressReq = buildExpressLikeReq(req, body, authUser);
  expressReq.identityTrust = buildIdentityTrustContext(expressReq);
  const identity = assertMoneyPathIdentityAllowed(expressReq.identityTrust, {
    mode: 'strict_authenticated',
  });
  if (!identity.ok) {
    logCheckoutSlimBreadcrumb('checkout_slim_denied', {
      reason: 'identity_trust',
      httpStatus: identity.status ?? 403,
    });
    res.statusCode = identity.status ?? 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        error: 'identity_not_trusted',
        code: 'IDENTITY_TRUST_REQUIRED',
      }),
    );
    return;
  }

  const capture = attachJsonCapture(res);

  try {
    const run =
      typeof globalThis.__zwSlimCreateCheckoutImpl === 'function'
        ? globalThis.__zwSlimCreateCheckoutImpl
        : createCheckoutSession;
    await withTimeout(run(expressReq, res), SLIM_CHECKOUT_HANDLER_TIMEOUT_MS);
  } catch (err) {
    if (err && typeof err === 'object' && err.code === 'CHECKOUT_SLIM_TIMEOUT') {
      logCheckoutSlimBreadcrumb('checkout_slim_error', { reason: 'timeout' });
      if (!res.writableEnded) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify(
            clientErrorBody('Service unavailable', AUTH_ERROR_CODE.AUTH_INVALID_REQUEST),
          ),
        );
      }
      return;
    }
    if (err instanceof HttpError) {
      const code =
        typeof err.code === 'string' && err.code.length > 0
          ? err.code
          : AUTH_ERROR_CODE.AUTH_INVALID_REQUEST;
      if (!res.writableEnded) {
        res.statusCode = err.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(clientErrorBody(err.message, code)));
      }
      return;
    }
    logCheckoutSlimBreadcrumb('checkout_slim_error', { reason: 'internal' });
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify(
          clientErrorBody('Service unavailable', API_CONTRACT_CODE.INTERNAL_ERROR),
        ),
      );
    }
    return;
  }

  const out = capture.getBody();
  const hasUrl =
    out != null &&
    typeof out === 'object' &&
    typeof out.url === 'string' &&
    out.url.startsWith('https://');
  const hasOrderId =
    out != null &&
    typeof out === 'object' &&
    typeof out.orderId === 'string' &&
    out.orderId.length > 0;

  logCheckoutSlimBreadcrumb('checkout_slim_success', {
    httpStatus: capture.getStatus(),
    hasCheckoutUrl: hasUrl,
    hasOrderId,
    orderIdSuffix:
      hasOrderId && typeof out.orderId === 'string'
        ? out.orderId.slice(-10)
        : null,
  });
}
