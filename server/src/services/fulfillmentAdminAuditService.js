/**
 * Durable admin audit for web top-up fulfillment mutations (internal DB only — never public API).
 */
import { prisma } from '../db.js';

/**
 * @param {object} params
 * @param {string} params.event
 * @param {{ id: string, email?: string, role: string }} params.actor
 * @param {string} params.action
 * @param {string} [params.orderId]
 * @param {string} params.reason
 * @param {string} [params.ip]
 * @param {Record<string, unknown>} [params.extra]
 */
export async function writeWebTopupFulfillmentAdminAudit(params) {
  const {
    event,
    actor,
    action,
    orderId,
    reason,
    ip,
    extra = {},
  } = params;
  const safePayload = {
    actor: {
      idSuffix: String(actor.id).slice(-8),
      role: actor.role,
    },
    action,
    orderIdSuffix: orderId ? orderId.slice(-8) : undefined,
    reason: String(reason).slice(0, 500),
    at: new Date().toISOString(),
    ...extra,
  };
  await prisma.auditLog.create({
    data: {
      event: String(event),
      payload: JSON.stringify(safePayload),
      ip: ip ? String(ip).slice(0, 64) : null,
    },
  });
}
