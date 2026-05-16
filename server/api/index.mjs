/**
 * Vercel serverless entry: Express app without `listen()`.
 * Request handling must match the long-running API runtime; background work belongs
 * to the dedicated worker lifecycle, not the HTTP process.
 */
import '../src/runtime/registerServerlessRuntime.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { sendLivenessJsonOk } from '../src/lib/sendLivenessJsonOk.js';
import { handleSlimReady } from './slimReadyHandler.mjs';

let cachedHandler = null;

function requestPathname(url) {
  if (typeof url !== 'string') return '';
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/** Strip trailing slash (except `/`) for stable routing on probes. */
function normalizedPathname(url) {
  let p = requestPathname(url);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/**
 * Fast staging/LB probe: never loads bootstrap, Redis, or Express (avoids cold-start hangs).
 * Real API traffic still uses `getHandler()`.
 */
function sendApiIndexProbeOk(res) {
  console.log('[startup] phase=request_start route=/api/index');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
  console.log('[startup] phase=request_done route=/api/index status=200');
}

function notifyServerlessHealthTest(event) {
  globalThis.__zwServerlessHealthTestHook?.(event);
}

async function getHandler() {
  if (!cachedHandler) {
    notifyServerlessHealthTest('bootstrap_import');
    await import('../bootstrap.js');
    console.log('[startup] phase=prisma_init_start');
    notifyServerlessHealthTest('app_graph_import');
    const [{ createValidatedApp }, { default: serverless }] = await Promise.all([
      import('../src/index.js'),
      import('serverless-http'),
    ]);
    console.log('[startup] phase=prisma_init_done');
    console.log('[startup] phase=route_register_start');
    const app = createValidatedApp();
    console.log('[startup] phase=route_register_done');
    cachedHandler = serverless(app, {
      /**
       * Prisma / Redis clients keep sockets open. In serverless we want the response to flush
       * without waiting for the event loop to empty.
       */
      callbackWaitsForEmptyEventLoop: false,
    });
    console.log('[startup] phase=handler_ready');
  }
  return cachedHandler;
}

export default function handler(req, res) {
  /**
   * Keep liveness probes independent from the wider app import graph so `/health`
   * stays cheap and deterministic even when optional integrations are slow.
   */
  if (req.method === 'GET') {
    const hp = normalizedPathname(req.url);
    if (hp === '/' || hp === '/health' || hp === '/api/health') {
      sendLivenessJsonOk(res);
      return;
    }
  }
  /**
   * Slim readiness: DB core probe only with a hard outer deadline — avoids `bootstrap.js`
   * (Redis init) and full Express graph + `getHealthDeps()` stalls on Vercel.
   */
  if (
    req.method === 'GET' &&
    (normalizedPathname(req.url) === '/ready' ||
      normalizedPathname(req.url) === '/api/ready')
  ) {
    return handleSlimReady(res);
  }
  {
    const p = normalizedPathname(req.url);
    if (
      (req.method === 'GET' || req.method === 'HEAD') &&
      (p === '/api/index' || p === '/index')
    ) {
      if (req.method === 'HEAD') {
        console.log('[startup] phase=request_start route=/api/index');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).end();
        console.log('[startup] phase=request_done route=/api/index status=200');
        return;
      }
      sendApiIndexProbeOk(res);
      return;
    }
  }
  /**
   * Stripe webhooks: verify signature before bootstrap (Redis + full Express import graph).
   * Invalid/missing signatures return 400 here; verified payloads replay into the existing
   * Express `/webhooks/stripe` route (see slimStripeWebhookHandler.mjs).
   */
  if (req.method === 'POST' && requestPathname(req.url) === '/webhooks/stripe') {
    return import('./slimStripeWebhookHandler.mjs').then((m) =>
      m.handleSlimStripeWebhookPost(req, res, getHandler),
    );
  }
  /**
   * Auth login: avoid cold `getHandler()` (bootstrap Redis + full Express) so staging login
   * returns before Vercel FUNCTION_INVOCATION_TIMEOUT.
   */
  {
    const p = normalizedPathname(req.url);
    if (req.method === 'POST' && (p === '/api/auth/login' || p === '/auth/login')) {
      return import('./slimAuthLoginHandler.mjs').then((m) =>
        m.handleSlimAuthLoginPost(req, res),
      );
    }
  }
  /**
   * Auth register: avoid cold `getHandler()` (bootstrap Redis + full Express) so staging
   * registration returns before Vercel FUNCTION_INVOCATION_TIMEOUT.
   */
  {
    const p = normalizedPathname(req.url);
    if (
      req.method === 'POST' &&
      (p === '/api/auth/register' || p === '/auth/register')
    ) {
      return import('./slimAuthRegisterHandler.mjs').then((m) =>
        m.handleSlimAuthRegisterPost(req, res),
      );
    }
  }
  /**
   * Auth request-otp / resend-otp: avoid cold `getHandler()` so OTP issue returns before
   * Vercel FUNCTION_INVOCATION_TIMEOUT (SMTP + Prisma only, no Redis bootstrap).
   */
  {
    const p = normalizedPathname(req.url);
    if (
      req.method === 'POST' &&
      (p === '/api/auth/request-otp' ||
        p === '/auth/request-otp' ||
        p === '/api/auth/resend-otp' ||
        p === '/auth/resend-otp')
    ) {
      return import('./slimAuthRequestOtpHandler.mjs').then((m) =>
        m.handleSlimAuthRequestOtpPost(req, res),
      );
    }
  }
  /**
   * Staging operator email verify (Path B): runs on Vercel DB — local `vercel env run`
   * does not inject decryptable production DATABASE_URL for Prisma from operator machines.
   */
  {
    const p = normalizedPathname(req.url);
    if (
      req.method === 'POST' &&
      p === '/api/ops/staging-verify-operator-email'
    ) {
      return import('./slimStagingOperatorVerifyEmailHandler.mjs').then((m) =>
        m.handleSlimStagingOperatorVerifyEmailPost(req, res),
      );
    }
  }
  /**
   * Hosted checkout (Bearer JWT): slim path — full `getHandler()` cold start caused client timeouts.
   * Dev `X-ZW-Dev-Checkout` bypass still uses Express via `getHandler()`.
   */
  {
    const p = normalizedPathname(req.url);
    if (
      req.method === 'POST' &&
      (p === '/api/create-checkout-session' || p === '/create-checkout-session')
    ) {
      const authz = req.headers?.authorization;
      const hasBearer =
        typeof authz === 'string' &&
        authz.startsWith('Bearer ') &&
        authz.slice(7).trim().length > 0;
      if (hasBearer) {
        return import('./slimCreateCheckoutHandler.mjs').then((m) =>
          m.handleSlimCreateCheckoutPost(req, res),
        );
      }
      const devHdr = req.headers?.['x-zw-dev-checkout'];
      const devProbe =
        typeof devHdr === 'string' && String(devHdr).trim().length >= 16;
      if (!devProbe) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(401).json(
          clientErrorBody('Authentication required', 'auth_required'),
        );
        return;
      }
    }
  }
  return getHandler().then((nextHandler) => {
    const route = normalizedPathname(req.url);
    if (route === '/api/index') {
      console.log('[startup] phase=request_start route=/api/index');
      res.once('finish', () => {
        console.log(
          `[startup] phase=request_done route=/api/index status=${res.statusCode}`,
        );
      });
    }
    return nextHandler(req, res);
  });
}
