import { env } from '../config/env.js';
import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';

/** Unified response for all money-moving routes when `PRELAUNCH_LOCKDOWN=true`. */
export const PRELAUNCH_MONEY_BODY = clientErrorBody(
  'Service temporarily unavailable (pre-launch)',
  'prelaunch_lockdown',
);

/** New payment creation blocked when `PAYMENTS_LOCKDOWN_MODE=true` (webhooks unchanged). */
export const PAYMENTS_LOCKDOWN_BODY = clientErrorBody(
  'Payments temporarily unavailable',
  API_CONTRACT_CODE.PAYMENTS_LOCKDOWN,
);

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

/**
 * Optional operator lock: block new money **creation** routes (checkout, top-up, recharge) while
 * keeping Stripe webhooks and DB settlement paths available.
 * Mount after {@link blockMoneyRoutesIfPrelaunch} so prelaunch still wins.
 */
export function blockPaymentsIfLockdownMode(req, res, next) {
  if (env.paymentsLockdownMode) {
    req.log?.info(
      { securityEvent: 'payments_lockdown_blocked', path: req.path },
      'security',
    );
    return res.status(503).json(PAYMENTS_LOCKDOWN_BODY);
  }
  next();
}
