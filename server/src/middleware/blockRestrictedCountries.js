/**
 * Authoritative block for sanctioned / restricted regions (ISO-style tokens).
 * Mounted after `express.json()` so JSON bodies are parsed; does not run on `/webhooks/stripe`
 * (mounted before raw body parser).
 */
import {
  isRestrictedRegionCode,
  RESTRICTED_REGION_CODES,
} from '../policy/restrictedRegions.js';

export { RESTRICTED_REGION_CODES, isRestrictedRegionCode } from '../policy/restrictedRegions.js';

function norm(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase();
}

/**
 * @param {import('express').Request} req
 * @returns {string[]}
 */
function collectRegionCandidates(req) {
  const out = [];
  const q = req.query ?? {};
  for (const k of [
    'country',
    'countryCode',
    'senderCountry',
    'destinationCountry',
    'originCountry',
  ]) {
    const v = q[k];
    if (typeof v === 'string' && v.length <= 32) out.push(norm(v));
  }
  const b = req.body;
  if (!b || typeof b !== 'object' || Buffer.isBuffer(b)) return out;
  for (const k of [
    'senderCountry',
    'country',
    'countryCode',
    'originCountry',
    'destinationCountry',
  ]) {
    const v = b[k];
    if (typeof v === 'string' && v.length <= 32) out.push(norm(v));
  }
  if (b.billingJurisdiction && typeof b.billingJurisdiction === 'object') {
    for (const k of ['countryCode', 'stateOrRegion']) {
      const v = b.billingJurisdiction[k];
      if (typeof v === 'string' && v.length <= 32) out.push(norm(v));
    }
  }
  if (b.recipientPhone && typeof b.recipientPhone === 'object') {
    const v = b.recipientPhone.countryCode;
    if (typeof v === 'string' && v.length <= 16) out.push(norm(v));
  }
  return out.filter(Boolean);
}

function firstRestrictedHit(candidates) {
  for (const c of candidates) {
    if (isRestrictedRegionCode(c)) return c;
  }
  return null;
}

function shouldSkipPath(urlPath) {
  const p = String(urlPath ?? '').split('?')[0];
  if (p === '/health' || p === '/api/health') return true;
  if (p === '/ready' || p === '/api/ready') return true;
  if (p.startsWith('/metrics')) return true;
  if (p.startsWith('/webhooks/stripe')) return true;
  /** Stripe return HTML routes (non-JSON). */
  if (p === '/success' || p === '/cancel') return true;
  return false;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function blockRestrictedCountries(req, res, next) {
  if (shouldSkipPath(req.path)) return next();
  if (req.method === 'OPTIONS') return next();
  const hit = firstRestrictedHit(collectRegionCandidates(req));
  if (hit) {
    req.log?.warn(
      {
        securityEvent: 'restricted_region_blocked',
        region: hit,
        path: req.path,
        method: req.method,
      },
      'security',
    );
    return res.status(403).json({
      error: 'restricted_region',
      message: 'Service not available in this region',
    });
  }
  next();
}
