/**
 * Optional ADMIN_ALLOWED_IPS guard for WebTopup admin routes.
 * Empty / unset = disabled (pilot-friendly; local dev unchanged).
 */

import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { webTopupLog } from '../lib/webTopupObservability.js';

/**
 * @param {import('express').Request} req
 */
export function normalizeAdminRequestIp(req) {
  const raw = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return typeof raw === 'string' ? raw.replace(/^::ffff:/, '') : String(raw);
}

/**
 * @returns {Set<string> | null} null = allowlist off
 */
export function getAdminAllowedIpSet() {
  const raw = String(process.env.ADMIN_ALLOWED_IPS ?? '').trim();
  if (!raw) return null;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return new Set(parts);
}

export function isAdminIpAllowlistActive() {
  const s = getAdminAllowedIpSet();
  return s != null && s.size > 0;
}

/**
 * Express middleware: 403 when allowlist is configured and IP not listed.
 */
export function requireAdminIpAllowlist(req, res, next) {
  const allowed = getAdminAllowedIpSet();
  if (!allowed || allowed.size === 0) return next();

  const ip = normalizeAdminRequestIp(req);
  if (allowed.has(ip)) return next();

  webTopupLog(req.log, 'warn', 'webtop_admin_ip_blocked', {
    path: req.originalUrl?.slice(0, 200) ?? req.path,
    traceId: req.traceId ?? undefined,
    clientIp: ip,
    reason: 'not_in_allowlist',
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(403).json(
    clientErrorBody('Forbidden from this IP for admin routes', API_CONTRACT_CODE.AUTH_FORBIDDEN, {
      error: 'admin_ip_forbidden',
    }),
  );
}
