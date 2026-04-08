import { prisma } from '../db.js';

/**
 * Persist minimal **pre-HTTP** dispatch evidence on the fulfillment attempt (crash-ordering audit).
 * Runs immediately before Reloadly Redis in-flight marker + HTTP POST.
 * DB remains authoritative; Redis markers can evaporate — this row survives for recon.
 *
 * @param {string} attemptId FulfillmentAttempt.id
 * @param {{ customIdentifier: string, traceId?: string | null }} fields
 */
export async function persistReloadlyPreHttpDispatchEvidence(attemptId, fields) {
  const id = String(attemptId ?? '').trim();
  const customIdentifier = String(fields.customIdentifier ?? '').trim();
  if (!id || !customIdentifier) return;

  const att = await prisma.fulfillmentAttempt.findUnique({
    where: { id },
    select: { requestSummary: true },
  });
  if (!att) return;

  /** @type {Record<string, unknown>} */
  let req = {};
  if (att.requestSummary != null && String(att.requestSummary).trim()) {
    try {
      const o = JSON.parse(String(att.requestSummary));
      if (o && typeof o === 'object') req = /** @type {Record<string, unknown>} */ (o);
    } catch {
      req = {};
    }
  }

  if (req.reloadlyPreHttpArmedAt != null) {
    return;
  }

  req.reloadlyPreHttpArmedAt = new Date().toISOString();
  req.reloadlyCustomIdentifier = customIdentifier;
  if (fields.traceId != null && String(fields.traceId).trim()) {
    req.reloadlyPreHttpTraceId = String(fields.traceId).trim();
  }

  await prisma.fulfillmentAttempt.update({
    where: { id },
    data: { requestSummary: JSON.stringify(req) },
  });
}
