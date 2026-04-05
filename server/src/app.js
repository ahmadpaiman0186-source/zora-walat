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
import { httpLatencyMiddleware } from './middleware/httpLatencyMiddleware.js';
import healthRoutes from './routes/health.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import rechargeRoutes from './routes/recharge.routes.js';
import orderRoutes from './routes/order.routes.js';
import reconciliationRoutes from './routes/reconciliation.routes.js';
import webTopupFulfillmentAdminRoutes from './routes/webTopupFulfillmentAdmin.routes.js';
import adminOrdersRoutes from './routes/adminOrders.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import loyaltyRoutes from './routes/loyalty.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import stripeWebhookRouter from './routes/stripeWebhook.routes.js';
import topupOrderRoutes from './routes/topupOrder.routes.js';
import opsRoutes from './routes/ops.routes.js';
import marginRoutes from './routes/margin.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  apiIpLimiter,
  authLimiter,
  catalogLimiter,
  stripeWebhookLimiter,
} from './middleware/rateLimits.js';
import authRoutes from './routes/auth.routes.js';

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
        // TEMP TEST MODE (dev checkout bypass) — remove before production if unused
        'X-ZW-Dev-Checkout',
      ],
    }),
  );

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

  app.use(
    '/webhooks/stripe',
    stripeWebhookLimiter,
    express.raw({ type: 'application/json', limit: '256kb' }),
    stripeWebhookRouter,
  );

  app.use(express.json({ limit: '32kb', strict: true }));

  app.use(healthRoutes);
  app.use('/auth', authLimiter, authRoutes);
  app.use(paymentRoutes);
  app.use('/api/topup-orders', topupOrderRoutes);
  app.use('/catalog', catalogLimiter, catalogRoutes);
  app.use('/api/wallet', apiIpLimiter, walletRoutes);
  app.use('/api/recharge', apiIpLimiter, rechargeRoutes);
  app.use('/api/orders', apiIpLimiter, orderRoutes);
  app.use('/api/transactions', apiIpLimiter, transactionsRoutes);
  app.use('/api/loyalty', apiIpLimiter, loyaltyRoutes);
  app.use('/api/notifications', apiIpLimiter, notificationsRoutes);
  app.use('/api/admin', apiIpLimiter, reconciliationRoutes);
  app.use('/api/admin', apiIpLimiter, webTopupFulfillmentAdminRoutes);
  app.use('/api/admin', apiIpLimiter, adminOrdersRoutes);
  app.use('/api/admin', apiIpLimiter, opsRoutes);
  app.use('/api/admin', apiIpLimiter, marginRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
