import { createHash } from 'node:crypto';

/**
 * @param {import('pino').Logger | undefined} log
 * @param {{
 *   route: string;
 *   decision: string;
 *   reasonCode: string | null;
 *   userId?: string | null;
 *   sessionKey?: string | null;
 *   traceId?: string | null;
 *   metadata?: Record<string, unknown>;
 * }} fields
 */
export function logRiskDecision(log, fields) {
  const sessionKeyHash =
    fields.sessionKey && typeof fields.sessionKey === 'string'
      ? createHash('sha256').update(fields.sessionKey, 'utf8').digest('hex').slice(0, 16)
      : null;
  const userIdSuffix =
    fields.userId && typeof fields.userId === 'string'
      ? fields.userId.slice(-8)
      : null;

  const payload = {
    securityEvent: 'risk_decision',
    route: fields.route,
    decision: fields.decision,
    reasonCode: fields.reasonCode,
    ...(userIdSuffix ? { userIdSuffix } : {}),
    ...(sessionKeyHash ? { sessionKeyHash } : {}),
    traceId: fields.traceId ?? null,
    ...(fields.metadata && Object.keys(fields.metadata).length
      ? { riskMeta: fields.metadata }
      : {}),
  };

  if (fields.decision === 'deny' || fields.decision === 'review') {
    log?.warn?.(payload, 'risk');
  } else {
    log?.info?.(payload, 'risk');
  }
}
