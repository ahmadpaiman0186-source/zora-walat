import { checkoutAbuseBlockHighSeverityImmediately } from '../lib/fraudControlsPolicy.js';
import { hashIpForLogSuffix } from './fraudHashes.js';

/**
 * Logs structured L6 decision — no raw phone, email, tokens, or full IP.
 * @param {import('pino').Logger | undefined} log
 * @param {{
 *   decision: string,
 *   severity: string,
 *   reasonCodes: string[],
 *   score: number,
 *   traceId: string | null,
 *   userId: string | null | undefined,
 *   recipientPhoneHash: string | null,
 *   clientIp: string | undefined,
 * }} row
 */
export function logFraudRiskDecision(log, row) {
  const userId = row.userId ?? '';
  const uidSuffix =
    userId.length >= 6 ? userId.slice(-6) : userId ? `…${userId.length}` : '';
  const ph =
    row.recipientPhoneHash && row.recipientPhoneHash.length >= 8
      ? row.recipientPhoneHash.slice(-8)
      : null;
  const ipH = hashIpForLogSuffix(row.clientIp);
  const ipHashSuffix = ipH.length >= 12 ? ipH.slice(-12) : ipH;

  log?.info?.(
    {
      event: 'fraud_risk_decision',
      decision: row.decision,
      severity: row.severity,
      reasonCodes: row.reasonCodes,
      score: row.score,
      traceId: row.traceId,
      userIdSuffix: uidSuffix || null,
      phoneHashSuffix: ph,
      ipHashSuffix,
    },
    'fraud_risk_decision',
  );
}

/**
 * Fail-closed in production/test (see fraudControlsPolicy); lenient local dev logs only
 * unless CHECKOUT_ABUSE_STRICT. Preserves legacy rapid in-flight block for high abuse in dev.
 *
 * @param {{
 *   risk: { decision: string },
 *   abuse: { severity: string },
 *   rapidInFlightFingerprint: boolean,
 * }} p
 * @returns {{ httpBlock: boolean, status: number }}
 */
export function hostedCheckoutFraudHttpDecision(p) {
  const strict = checkoutAbuseBlockHighSeverityImmediately();

  if (strict && p.risk.decision === 'block') {
    return { httpBlock: true, status: 429 };
  }

  if (strict && p.abuse.severity === 'high') {
    return { httpBlock: true, status: 429 };
  }

  if (!strict && p.abuse.severity === 'high' && p.rapidInFlightFingerprint) {
    return { httpBlock: true, status: 429 };
  }

  return { httpBlock: false, status: 0 };
}
