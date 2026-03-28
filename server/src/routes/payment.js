import express from 'express';

const router = express.Router();

/** MVP placeholder — real flow uses Stripe PaymentIntents on the backend. */
router.post('/prepare', (req, res) => {
  const { amountUsd, orderId, currency } = req.body || {};
  res.json({
    ok: true,
    mock: true,
    amountUsd: amountUsd ?? null,
    currency: currency || 'usd',
    orderId: orderId ?? null,
    message: 'Payment preparation mocked — connect Stripe for production',
    hint: 'POST /api/payment/prepare is a stub; wire Stripe in payment routes later',
  });
});

export default router;
