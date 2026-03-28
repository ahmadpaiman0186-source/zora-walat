import express from 'express';
import * as walletService from '../services/walletService.js';

const router = express.Router();

router.get('/balance', (_req, res) => {
  res.json(walletService.getWalletState());
});

router.post('/topup', (req, res) => {
  try {
    const amount = req.body?.amount ?? req.body?.amountUsd;
    const next = walletService.topup(amount);
    res.json({ ok: true, ...next });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Topup failed' });
  }
});

export default router;
