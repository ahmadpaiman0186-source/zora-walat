import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { getStripeClient } from './config.js';
import { prisma } from './db.js';
import rechargeRoutes from './routes/recharge.js';
import walletRoutes from './routes/wallet.js';
import paymentRoutes from './routes/payment.js';
import { createPaymentIntentRouter } from './routes/paymentIntents.js';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Api-Key'],
  }),
);
app.use(express.json());

app.get('/', (req, res) => res.send('API OK'));

/**
 * Minimal test/dev endpoint (Flutter uses `/api/payment-intents/*` in production).
 * POST body: `{ "amount": 500, "currency": "usd" }` — amount in cents.
 */
app.post('/create-payment-intent', async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe not configured (set STRIPE_SECRET_KEY in .env)',
      });
    }
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 50) {
      return res.status(400).json({
        error: 'amount (integer cents, minimum 50) required',
      });
    }
    const currency = String(req.body?.currency || 'usd').toLowerCase();
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      automatic_payment_methods: { enabled: true },
    });
    return res.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
    });
  } catch (err) {
    logger.error({ err }, 'create-payment-intent failed');
    return res.status(502).json({ error: String(err?.message || err) });
  }
});

/** Minimal stub so Flutter [RemoteTelecomService] does not 404 on the legacy hub. */
app.get('/catalog/airtime', (req, res) => {
  const operator = String(req.query.operator || 'roshan').replace(/[^a-z0-9]/gi, '');
  const safe = operator || 'roshan';
  const items = [
    { id: `${safe}_air_10m`, minutes: 10, retailUsdCents: 500 },
    { id: `${safe}_air_15m`, minutes: 15, retailUsdCents: 750 },
    { id: `${safe}_air_25m`, minutes: 25, retailUsdCents: 1000 },
  ];
  res.json({ items });
});

app.use('/api/recharge', rechargeRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use(
  '/api/payment-intents',
  createPaymentIntentRouter({ prisma, logger }),
);

app.listen(8787, () => {
  console.log('Server running on http://localhost:8787');
  logger.info({ port: 8787 }, 'Zora-Walat API listening');
});
