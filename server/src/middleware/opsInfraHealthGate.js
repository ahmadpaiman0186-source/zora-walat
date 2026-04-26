import { env } from '../config/env.js';
import { PRELAUNCH_MONEY_BODY } from './prelaunchMoneyBlock.js';

/**
 * Shared secret for detailed infra/readiness surfaces during private pre-launch.
 * `OPS_HEALTH_TOKEN` (documented in .env.example) or `OPS_INFRA_HEALTH_TOKEN` (alias).
 */
export function opsInfraHealthTokenMatches(req) {
  const t = String(env.opsInfraHealthToken ?? '').trim();
  if (t.length < 16) return false;
  const auth = req.headers.authorization;
  const x = req.headers['x-zw-ops-token'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    if (auth.slice(7).trim() === t) return true;
  }
  if (typeof x === 'string' && x.trim() === t) return true;
  return false;
}

/**
 * When `PRELAUNCH_LOCKDOWN=true`, deny unauthenticated detailed infra/readiness unless
 * `OPS_HEALTH_TOKEN` (or alias) matches `Authorization: Bearer …` or `X-ZW-Ops-Token`.
 * @returns {boolean} true if the response was already sent
 */
export function denyUnauthenticatedInfraIfPrelaunch(req, res) {
  if (!env.prelaunchLockdown) return false;
  if (opsInfraHealthTokenMatches(req)) return false;
  req.log?.info(
    { securityEvent: 'prelaunch_infra_surface_blocked', path: req.path },
    'security',
  );
  res.setHeader('Cache-Control', 'no-store');
  res.status(503).json(PRELAUNCH_MONEY_BODY);
  return true;
}
