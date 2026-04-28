import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { PINO_HTTP_REDACT_PATHS } from './config/loggingRedact.js';
import { isCorsOriginAllowed } from './lib/corsPolicy.js';
import { logCorsRejected } from './middleware/securityObservability.js';
import { attachMinimalRequestLogger } from './middleware/minimalRequestLogger.js';
import { requestContextMiddleware } from './middleware/requestContextMiddleware.js';
import healthRoutes from './routes/health.routes.js';
import apiRoutes from './routes/index.js';
import paymentRoutes from './routes/payment.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import rechargeRoutes from './routes/recharge.routes.js';
import orderRoutes from './routes/order.routes.js';
import reconciliationRoutes from './routes/reconciliation.routes.js';
import webTopupFulfillmentAdminRoutes from './routes/webTopupFulfillmentAdmin.routes.js';
import webtopupAdminControlRoutes from './routes/webtopupAdminControl.routes.js';
import adminOrdersRoutes from './routes/adminOrders.routes.js';
import processingManualRoutes from './routes/processingManual.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import loyaltyRoutes from './routes/loyalty.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import stripeWebhookRouter from './routes/stripeWebhook.routes.js';
import topupOrderRoutes from './routes/topupOrder.routes.js';
import opsRoutes from './routes/ops.routes.js';
import marginRoutes from './routes/margin.routes.js';
import referralRoutes from './routes/referral.routes.js';
import supportRoutes from './routes/support.routes.js';
import internalWebtopupLogsRoutes from './routes/internalWebtopupLogs.routes.js';
import fulfillmentDlqRoutes from './routes/fulfillmentDlq.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  apiIpLimiter,
  authLimiter,
  catalogLimiter,
  stripeWebhookLimiter,
} from './middleware/rateLimits.js';
import authRoutes from './routes/auth.routes.js';
import { mountCheckoutReturnRoutesIfNonProduction } from './routes/checkoutReturn.routes.js';

/**
 * First line of defense for operators: proves the request matched `/webhooks/stripe`
 * (before rate limit and raw-body parsing). If this prints but `stripeWebhook.routes.js`
 * does not, check rate limiting; if neither prints, the POST is not reaching this process
 * (wrong URL/port, WSL-vs-Windows loopback, firewall, different API instance).
 */
function logStripeWebhookIngress(req, res, next) {
  const sig = req.headers['stripe-signature'];
  const hasSig = typeof sig === 'string' && sig.length > 0;
  const cl = req.headers['content-length'];
  req.log?.info?.(
    {
      stripeWebhookIngress: true,
      method: req.method,
      path: req.originalUrl,
      stripeSignature: hasSig ? 'present' : 'absent',
      contentLength: cl ?? null,
      traceId: req.traceId ?? null,
    },
    'stripe_webhook_ingress',
  );
  next();
}

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (isCorsOriginAllowed(origin)) return callback(null, true);
  return callback(null, false);
}

export function createApp() {
  const logger = pino({
    level: env.logLevel,
    redact: { paths: PINO_HTTP_REDACT_PATHS, censor: '[Redacted]' },
  });

  const app = express();
  app.disable('x-powered-by');
  /** Correct `req.ip` behind reverse proxy / CDN (rate limits, logs). */
  if (env.trustProxyHops !== false) {
    app.set('trust proxy', env.trustProxyHops);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: corsOrigin,
      credentials: false,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Idempotency-Key',
        'Stripe-Signature',
        'X-Trace-Id',
        'X-Request-Id',
        'X-ZW-Ops-Token',
        /** Web top-up: proves possession of `sessionKey` when creating a PaymentIntent for an order. */
        'X-ZW-WebTopup-Session',
        /** WebTopup admin control (`/api/admin/webtopup/*`): alternative to `Authorization: Bearer`. */
        'X-Admin-Secret',
        // TEMP TEST MODE (dev checkout bypass) — remove before production if unused
        'X-ZW-Dev-Checkout',
      ],
      exposedHeaders: ['X-Trace-Id', 'X-Request-Id'],
    }),
  );

  /** Correlation id for money-path logs (Stripe webhooks + JSON API). */
  app.use(requestContextMiddleware);

  if (env.prelaunchLockdown) {
    app.use(attachMinimalRequestLogger(logger));
  } else {
    app.use(
      pinoHttp({
        logger,
        redact: PINO_HTTP_REDACT_PATHS,
      }),
    );
  }

  app.use(logCorsRejected);

  /**
   * Stripe webhooks need the raw body for signature verification — this mount MUST stay
   * before global express.json(). Handler: ./routes/stripeWebhook.routes.js
   */
  app.use(
    '/webhooks/stripe',
    logStripeWebhookIngress,
    stripeWebhookLimiter,
    express.raw({ type: 'application/json', limit: '256kb' }),
    stripeWebhookRouter,
  );

  app.use(express.json({ limit: '32kb', strict: true }));

  /** Prefix-only liveness (`GET /api/health`); `POST /api/checkout-pricing-quote` comes from `paymentRoutes` below. */
  app.use('/api', apiRoutes);

  /** Root liveness (`GET /health`), readiness (`GET /ready`), Prometheus (`GET /metrics`). */
  app.use(healthRoutes);
  app.use('/api/auth', authLimiter, authRoutes);
  /** Payment routes at root (`/create-checkout-session`, `/checkout-pricing-quote`, …). */
  app.use(paymentRoutes);
  /** Alias: same routes under `/api/*` for clients that prefix the API path. */
  app.use('/api', paymentRoutes);
  app.use('/api/topup-orders', topupOrderRoutes);
  app.use('/catalog', catalogLimiter, catalogRoutes);
  app.use('/api/wallet', apiIpLimiter, walletRoutes);
  app.use('/api/recharge', apiIpLimiter, rechargeRoutes);
  app.use('/api/orders', apiIpLimiter, orderRoutes);
  app.use('/api/transactions', apiIpLimiter, transactionsRoutes);
  app.use('/api/loyalty', apiIpLimiter, loyaltyRoutes);
  app.use('/api/referral', apiIpLimiter, referralRoutes);
  app.use('/api/notifications', apiIpLimiter, notificationsRoutes);
  app.use('/api/admin', apiIpLimiter, reconciliationRoutes);
  app.use('/api/admin', apiIpLimiter, fulfillmentDlqRoutes);
  app.use('/api/admin', apiIpLimiter, webTopupFulfillmentAdminRoutes);
  app.use('/api/admin/webtopup', apiIpLimiter, webtopupAdminControlRoutes);
  app.use('/api/admin', apiIpLimiter, adminOrdersRoutes);
  app.use('/api/admin', apiIpLimiter, processingManualRoutes);
  /** Ops/metrics JSON: legacy `/ops` and admin-prefixed `/api/admin/ops` (same router). */
  app.use('/ops', apiIpLimiter, opsRoutes);
  app.use('/api/admin/ops', apiIpLimiter, opsRoutes);
  app.use('/api/admin', apiIpLimiter, marginRoutes);
  app.use('/api/admin', apiIpLimiter, supportRoutes);

  /** Internal structured webtop observation buffer (token-gated; not for public clients). */
  app.use('/internal', apiIpLimiter, internalWebtopupLogsRoutes);

  /** Dev/local: Stripe success/cancel when client base is this API (see CLIENT_URL / Origin). */
  mountCheckoutReturnRoutesIfNonProduction(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
