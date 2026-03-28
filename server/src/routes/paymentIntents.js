import { Router } from 'express';
import { Prisma } from '../db.js';
import { z } from 'zod';
import { config, getStripeClient } from '../config.js';
import { getDataSku } from '../lib/dataPricing.js';
import { getAirtimeSku } from '../lib/pricing.js';
import {
  normalizeAfghanNational,
  validateAfghanMobileNational,
} from '../lib/phone.js';
import { runFraudChecks } from '../services/fraud.js';

const bodySchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  metadata: z.record(z.string(), z.string()).optional(),
});

export function createPaymentIntentRouter({ prisma, logger }) {
  const router = Router();

  router.post('/', async (req, res) => {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe not configured (set STRIPE_SECRET_KEY)',
      });
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { amount, currency, metadata = {} } = parsed.data;
    if (currency.toLowerCase() !== 'usd') {
      return res.status(400).json({ error: 'Only usd supported' });
    }

    const productId = metadata.product_id;
    const operatorKey = metadata.operator;
    if (!productId || !operatorKey) {
      return res.status(400).json({
        error: 'metadata.product_id and metadata.operator required',
      });
    }

    const line = metadata.service_line || '';
    let expectedCents;

    if (line === 'airtime') {
      const sku = getAirtimeSku(productId);
      if (!sku || sku.operatorKey !== operatorKey) {
        return res.status(400).json({ error: 'Invalid airtime product_id' });
      }
      expectedCents = sku.retailUsdCents;
    } else if (line === 'data') {
      const sku = getDataSku(productId);
      if (!sku || sku.operatorKey !== operatorKey) {
        return res.status(400).json({ error: 'Invalid data product_id' });
      }
      expectedCents = sku.retailUsdCents;
    } else {
      return res
        .status(400)
        .json({ error: 'metadata.service_line must be airtime or data' });
    }

    if (amount !== expectedCents) {
      return res.status(400).json({
        error: 'Amount mismatch',
        expected: expectedCents,
      });
    }

    const phoneRaw =
      metadata.phone_submitted || metadata.phone_masked || '';
    const national = normalizeAfghanNational(phoneRaw);
    const valid = validateAfghanMobileNational(national || '');
    if (!valid.ok || !national) {
      return res
        .status(400)
        .json({ error: 'Invalid recipient phone', detail: valid.error });
    }

    const fraud = await runFraudChecks({
      prisma,
      nationalPhone: national,
      amountUsdCents: amount,
      clientIp: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    });

    if (!fraud.ok) {
      await prisma.auditLog.create({
        data: {
          event: 'FRAUD_BLOCK_PAYMENT_INTENT',
          payload: JSON.stringify({
            reasons: fraud.reasons,
            score: fraud.score,
            operatorKey,
            productId,
          }),
          ip: req.ip,
        },
      });
      return res.status(403).json({
        error: 'Request blocked by risk checks',
        code: 'FRAUD',
        reasons: fraud.reasons,
      });
    }

    const idempotencyKey =
      req.get('idempotency-key') || req.get('Idempotency-Key') || undefined;

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          metadata: {
            ...metadata,
            operator: operatorKey,
            product_id: productId,
            recipient_national: national,
            fraud_score: String(fraud.score),
          },
        },
        idempotencyKey ? { idempotencyKey } : undefined,
      );

      try {
        await prisma.topupOrder.create({
          data: {
            stripePaymentIntentId: pi.id,
            idempotencyKey: idempotencyKey || null,
            status: 'PENDING',
            operatorKey,
            recipientE164: `+93${national}`,
            recipientNational: national,
            productId,
            amountUsdCents: amount,
            commissionCents: 0,
            fraudScore: fraud.score,
            clientIp: req.ip || null,
          },
        });
      } catch (dbErr) {
        if (
          dbErr instanceof Prisma.PrismaClientKnownRequestError &&
          dbErr.code === 'P2002'
        ) {
          const again = await stripe.paymentIntents.retrieve(pi.id);
          return res.json({
            clientSecret: again.client_secret,
            paymentIntentId: again.id,
            idempotent: true,
          });
        }
        throw dbErr;
      }

      await prisma.auditLog.create({
        data: {
          event: 'PAYMENT_INTENT_CREATED',
          payload: JSON.stringify({
            paymentIntentId: pi.id,
            operatorKey,
            productId,
            amount,
            fraudScore: fraud.score,
          }),
          ip: req.ip,
        },
      });

      return res.json({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      });
    } catch (e) {
      logger.error({ err: e }, 'Stripe PaymentIntent create failed');
      return res.status(502).json({ error: String(e.message || e) });
    }
  });

  return router;
}
