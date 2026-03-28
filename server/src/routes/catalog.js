import { Router } from 'express';
import { listAirtimeForOperator } from '../lib/pricing.js';

const router = Router();

/** GET /catalog/airtime?operator=roshan */
router.get('/airtime', (req, res) => {
  const operator = String(req.query.operator || '').trim();
  const allowed = ['roshan', 'mtn', 'etisalat', 'afghanWireless'];
  if (!allowed.includes(operator)) {
    return res.status(400).json({ error: 'Invalid operator' });
  }
  res.json({ items: listAirtimeForOperator(operator) });
});

export default router;
