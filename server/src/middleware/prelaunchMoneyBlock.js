import { env } from '../config/env.js';

/** Unified response for all money-moving routes when `PRELAUNCH_LOCKDOWN=true`. */
export const PRELAUNCH_MONEY_BODY = {
  error: 'Service temporarily unavailable (pre-launch)',
};

/**
 * Blocks checkout creation, wallet top-up, and recharge order execution.
 * Safe to mount before auth (cheap reject).
 */
export function blockMoneyRoutesIfPrelaunch(req, res, next) {
  if (env.prelaunchLockdown) {
    req.log?.info(
      { securityEvent: 'prelaunch_money_blocked', path: req.path },
      'security',
    );
    return res.status(503).json(PRELAUNCH_MONEY_BODY);
  }
  next();
}
