/**
 * Structured audit fields for WebTopup admin routes (no secrets).
 * Populated after {@link requireAdminSecret} resolves (adminAuthSource / adminSecretSlot).
 */

import { normalizeAdminRequestIp } from '../middleware/adminIpAllowlist.js';

/**
 * @param {import('express').Request} req
 */
export function webtopAdminAuditPayload(req) {
  return {
    clientIp: normalizeAdminRequestIp(req),
    adminAuthSource: req.adminAuthSource,
    adminSecretSlot: req.adminSecretSlot,
  };
}
