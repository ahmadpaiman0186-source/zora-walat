import { listAirtimeForOperator } from '../lib/pricing.js';

const ALLOWED = ['roshan', 'mtn', 'etisalat', 'afghanWireless'];

export function getAirtimeCatalog(req, res) {
  const operator = String(req.query.operator || '').trim();
  if (!ALLOWED.includes(operator)) {
    req.log?.warn(
      { securityEvent: 'catalog_invalid_operator' },
      'security',
    );
    return res.status(400).json({ error: 'Invalid operator' });
  }
  return res.json({ items: listAirtimeForOperator(operator) });
}
