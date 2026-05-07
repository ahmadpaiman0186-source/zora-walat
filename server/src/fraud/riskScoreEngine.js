/**
 * L6 — deterministic checkout risk scoring (no network I/O).
 */

/** @typedef {'low' | 'medium' | 'high'} FraudSeverity */
/** @typedef {'allow' | 'review' | 'block'} FraudDecision */

/**
 * @typedef {{
 *   traceId: string | null,
 *   abuseSeverity: 'low'|'medium'|'high',
 *   abuseReasonCodes: string[],
 *   velocity: {
 *     userCount: number,
 *     ipCount: number,
 *     recipientKeyCount: number,
 *     operatorIpCount: number,
 *     amountIpCount: number,
 *     distinctRecipientsOnIp: number,
 *     distinctIdempotencyKeys: number,
 *   },
 *   amountPackageMismatch: boolean,
 *   policyRequiresVerifiedEmail: boolean,
 *   emailVerified: boolean,
 *   isLocalProofIdentity: boolean,
 * }} CheckoutRiskInput
 */

/**
 * @param {CheckoutRiskInput} input
 * @returns {{ score: number, signals: string[] }}
 */
export function computeCheckoutRiskScore(input) {
  const signals = [];
  let score = 0;

  const { abuseSeverity, abuseReasonCodes, velocity } = input;

  if (abuseSeverity === 'high') {
    score += 58;
    signals.push('legacy_abuse_high');
  } else if (abuseSeverity === 'medium') {
    score += 32;
    signals.push('legacy_abuse_medium');
  }

  for (const c of abuseReasonCodes) {
    if (c === 'idempotency_key_rotation') {
      score += 28;
      signals.push('idempotency_rotation_signal');
    }
    if (c === 'excessive_recipient_ip_replay') {
      score += 26;
      signals.push('recipient_ip_replay_signal');
    }
    if (c === 'excessive_ip_attempts') {
      score += 12;
      signals.push('ip_attempt_cluster');
    }
  }

  const ip = velocity.ipCount;
  if (ip >= 12) {
    score += 28;
    signals.push('ip_velocity_high');
  } else if (ip >= 6) {
    score += 16;
    signals.push('ip_velocity_medium');
  } else if (ip >= 4) {
    score += 8;
    signals.push('ip_velocity_low');
  }

  const uc = velocity.userCount;
  if (uc >= 12) {
    score += 18;
    signals.push('user_velocity_high');
  } else if (uc >= 6) {
    score += 10;
    signals.push('user_velocity_medium');
  }

  if (velocity.recipientKeyCount >= 8) {
    score += 24;
    signals.push('recipient_spray');
  } else if (velocity.recipientKeyCount >= 5) {
    score += 14;
    signals.push('recipient_repeat');
  }

  if (velocity.distinctRecipientsOnIp >= 6) {
    score += 22;
    signals.push('many_recipients_same_ip');
  } else if (velocity.distinctRecipientsOnIp >= 4) {
    score += 12;
    signals.push('multi_recipient_same_ip');
  }

  if (velocity.operatorIpCount >= 10) {
    score += 14;
    signals.push('operator_ip_burst');
  }

  if (velocity.amountIpCount >= 10) {
    score += 12;
    signals.push('amount_ip_burst');
  }

  if (velocity.distinctIdempotencyKeys >= 4) {
    score += 34;
    signals.push('idempotency_key_rotation_velocity');
  } else if (velocity.distinctIdempotencyKeys >= 3) {
    score += 12;
    signals.push('idempotency_key_rotation_hint');
  }

  if (input.amountPackageMismatch) {
    score += 44;
    signals.push('amount_package_mismatch');
  }

  if (
    input.policyRequiresVerifiedEmail &&
    !input.emailVerified
  ) {
    score += 20;
    signals.push('unverified_email_money_path');
  }

  if (input.isLocalProofIdentity) {
    score += 6;
    signals.push('local_dev_identity_not_production_trust');
  }

  return { score: Math.min(100, score), signals: Array.from(new Set(signals)) };
}

/**
 * @param {number} score
 * @param {string[]} signals
 * @returns {{ severity: FraudSeverity, decision: FraudDecision, reasonCodes: string[] }}
 */
export function classifyRisk(score, signals) {
  /** @type {string[]} */
  const reasonCodes = [...signals];

  if (signals.includes('amount_package_mismatch')) {
    return {
      severity: 'high',
      decision: 'block',
      reasonCodes: Array.from(new Set(reasonCodes)),
    };
  }

  if (signals.includes('idempotency_key_rotation_velocity')) {
    return {
      severity: 'high',
      decision: 'block',
      reasonCodes: Array.from(new Set(reasonCodes)),
    };
  }

  if (score >= 72) {
    return {
      severity: 'high',
      decision: 'block',
      reasonCodes: Array.from(new Set(reasonCodes)),
    };
  }

  if (score >= 38) {
    return {
      severity: 'medium',
      decision: 'review',
      reasonCodes: Array.from(new Set(reasonCodes)),
    };
  }

  return {
    severity: 'low',
    decision: 'allow',
    reasonCodes: Array.from(new Set(reasonCodes)),
  };
}

/**
 * @param {CheckoutRiskInput} input
 * @returns {{
 *   score: number,
 *   severity: FraudSeverity,
 *   decision: FraudDecision,
 *   reasonCodes: string[],
 *   traceId: string | null,
 *   signals: string[],
 * }}
 */
export function buildRiskDecisionPayload(input) {
  const { score, signals } = computeCheckoutRiskScore(input);
  const { severity, decision, reasonCodes } = classifyRisk(score, signals);
  return {
    score,
    severity,
    decision,
    reasonCodes,
    traceId: input.traceId ?? null,
    signals,
  };
}
