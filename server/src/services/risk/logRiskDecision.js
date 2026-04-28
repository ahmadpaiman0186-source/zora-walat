import { createHash } from 'node:crypto';

import { MONEY_PATH_EVENT } from '../../domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../../infrastructure/logging/moneyPathLog.js';
import { bumpCounter } from '../../lib/opsMetrics.js';

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

  emitMoneyPathLog(MONEY_PATH_EVENT.RISK_DECISION, {
    traceId: fields.traceId ?? null,
    route: fields.route,
    decision: fields.decision,
    reasonCode: fields.reasonCode,
    ...(userIdSuffix ? { userIdSuffix } : {}),
    ...(sessionKeyHash ? { sessionKeyHash } : {}),
  });

  if (fields.decision === 'deny') {
    bumpCounter('risk_decision_deny_total');
    const rc = fields.reasonCode != null ? String(fields.reasonCode) : '';
    if (rc) {
      bumpCounter(
        `risk_decision_deny_${rc.replace(/[^a-z0-9_]/gi, '_').slice(0, 72)}`,
      );
    }
  }
}
