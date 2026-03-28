import express from 'express';
import * as rechargeService from '../services/rechargeService.js';

const router = express.Router();

router.post('/quote', (req, res) => {
  const { phone, operator } = req.body || {};
  if (!phone || !operator) {
    return res.status(400).json({ error: 'phone and operator are required' });
  }
  res.json(rechargeService.buildQuote({ phone, operator }));
});

router.post('/order', (req, res) => {
  const { phone, operator, packageId } = req.body || {};
  if (!phone || !operator || !packageId) {
    return res
      .status(400)
      .json({ error: 'phone, operator, and packageId are required' });
  }
  res
    .status(201)
    .json(rechargeService.createMockOrder({ phone, operator, packageId }));
});

export default router;
