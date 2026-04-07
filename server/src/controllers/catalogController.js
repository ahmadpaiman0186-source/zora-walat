import { listAirtimeForOperator } from '../lib/pricing.js';
import { prisma } from '../db.js';

const ALLOWED = ['roshan', 'mtn', 'etisalat', 'afghanWireless'];

/** GET /catalog/sender-countries — enabled Phase 1 sender regions (USD payers). */
export async function getSenderCountriesCatalog(req, res) {
  const rows = await prisma.senderCountry.findMany({
    where: { enabled: true },
    orderBy: { code: 'asc' },
    select: {
      code: true,
      displayName: true,
      enabled: true,
      riskBufferPercent: true,
      notes: true,
    },
  });
  return res.json({ items: rows });
}

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
