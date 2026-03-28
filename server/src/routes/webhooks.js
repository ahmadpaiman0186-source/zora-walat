import express from 'express';
import { config, getStripeClient } from '../config.js';
import { fulfillTopupOrder } from '../services/fulfillment.js';

export function createStripeWebhookRouter({ prisma, logger }) {
  const router = express.Router();

  router.post(
    '/',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const stripe = getStripeClient();
      const sig = req.headers['stripe-signature'];
      if (!stripe || !sig || !config.stripeWebhookSecret) {
        return res.status(400).send('Missing Stripe or webhook config');
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          config.stripeWebhookSecret,
        );
      } catch (e) {
        logger.warn({ err: e.message }, 'Stripe webhook signature invalid');
        return res.status(400).send(`Webhook Error: ${e.message}`);
      }

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;

        const order = await prisma.topupOrder.findUnique({
          where: { stripePaymentIntentId: pi.id },
        });

        if (!order) {
          logger.warn({ pi: pi.id }, 'No TopupOrder for PaymentIntent');
          return res.json({ received: true });
        }

        if (order.status === 'FULFILLED' || order.status === 'FULFILLMENT_FAILED') {
          return res.json({ received: true, idempotent: true });
        }

        await prisma.topupOrder.update({
          where: { id: order.id },
          data: { status: 'PAID' },
        });

        await prisma.auditLog.create({
          data: {
            event: 'STRIPE_PAYMENT_SUCCEEDED',
            payload: JSON.stringify({ paymentIntentId: pi.id }),
            ip: null,
          },
        });

        await fulfillTopupOrder({
          prisma,
          logger,
          stripe,
          paymentIntent: pi,
          order,
        });
      }

      return res.json({ received: true });
    },
  );

  return router;
}
