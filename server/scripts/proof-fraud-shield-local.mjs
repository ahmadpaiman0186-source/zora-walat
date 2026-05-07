/**
 * L6 fraud shield proof — no Stripe, no raw PII in stdout contract.
 * Run: npm --prefix server run proof:fraud-shield-local
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { buildRiskDecisionPayload } from '../src/fraud/riskScoreEngine.js';
import {
  hostedCheckoutFraudHttpDecision,
  logFraudRiskDecision,
} from '../src/fraud/fraudMoneyPathGuard.js';
import {
  incrementCheckoutVelocitySnapshot,
  resetTestStore,
} from '../src/fraud/velocityStore.js';
import { hashRecipientNationalForFraud } from '../src/fraud/fraudHashes.js';

const baseVel = () => ({
  userCount: 1,
  ipCount: 1,
  recipientKeyCount: 1,
  operatorIpCount: 1,
  amountIpCount: 1,
  distinctRecipientsOnIp: 1,
  distinctIdempotencyKeys: 1,
});

async function main() {
  resetTestStore();

  const clean = buildRiskDecisionPayload({
    traceId: 'proof-l6',
    abuseSeverity: 'low',
    abuseReasonCodes: [],
    velocity: baseVel(),
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  const cleanAllowed = clean.decision === 'allow';
  assert.equal(cleanAllowed, true);

  const reviewIp = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'medium',
    abuseReasonCodes: ['excessive_ip_attempts'],
    velocity: { ...baseVel(), ipCount: 5 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  const repeatedIpDetected =
    reviewIp.severity === 'medium' && reviewIp.decision === 'review';

  const saved = {
    STRICT: process.env.CHECKOUT_ABUSE_STRICT,
    RELAX: process.env.CHECKOUT_ABUSE_RELAX_DEV,
  };

  delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
  process.env.CHECKOUT_ABUSE_STRICT = 'true';
  let recipientReplayBlocked = false;
  let productionHighRiskBlocked = false;
  try {
    const blockRisk = buildRiskDecisionPayload({
      traceId: null,
      abuseSeverity: 'high',
      abuseReasonCodes: ['excessive_recipient_ip_replay'],
      velocity: { ...baseVel(), recipientKeyCount: 12, ipCount: 4 },
      amountPackageMismatch: false,
      policyRequiresVerifiedEmail: true,
      emailVerified: true,
      isLocalProofIdentity: false,
    });
    assert.equal(blockRisk.decision, 'block');
    recipientReplayBlocked =
      hostedCheckoutFraudHttpDecision({
        risk: { decision: blockRisk.decision },
        abuse: { severity: 'low' },
        rapidInFlightFingerprint: false,
      }).httpBlock === true;

    productionHighRiskBlocked =
      hostedCheckoutFraudHttpDecision({
        risk: { decision: 'block' },
        abuse: { severity: 'low' },
        rapidInFlightFingerprint: false,
      }).httpBlock === true;
  } finally {
    if (saved.STRICT === undefined) delete process.env.CHECKOUT_ABUSE_STRICT;
    else process.env.CHECKOUT_ABUSE_STRICT = saved.STRICT;
    if (saved.RELAX === undefined) delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
    else process.env.CHECKOUT_ABUSE_RELAX_DEV = saved.RELAX;
  }
  assert.equal(recipientReplayBlocked, true);
  assert.equal(productionHighRiskBlocked, true);

  const rot = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'low',
    abuseReasonCodes: [],
    velocity: { ...baseVel(), distinctIdempotencyKeys: 5, ipCount: 2 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  const idempotencyRotationDetected =
    rot.decision === 'block' &&
    rot.reasonCodes.some((c) => c.includes('idempotency'));

  delete process.env.CHECKOUT_ABUSE_STRICT;
  process.env.CHECKOUT_ABUSE_RELAX_DEV = 'true';
  let devModeNotBlocked = false;
  try {
    devModeNotBlocked =
      hostedCheckoutFraudHttpDecision({
        risk: { decision: 'block' },
        abuse: { severity: 'low' },
        rapidInFlightFingerprint: false,
      }).httpBlock === false;
  } finally {
    if (saved.STRICT === undefined) delete process.env.CHECKOUT_ABUSE_STRICT;
    else process.env.CHECKOUT_ABUSE_STRICT = saved.STRICT;
    if (saved.RELAX === undefined) delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
    else process.env.CHECKOUT_ABUSE_RELAX_DEV = saved.RELAX;
  }
  assert.equal(devModeNotBlocked, true);

  /** @type {string[]} */
  const captured = [];
  const log = {
    info(obj) {
      captured.push(JSON.stringify(obj));
    },
  };
  logFraudRiskDecision(log, {
    decision: 'allow',
    severity: 'low',
    reasonCodes: [],
    score: 5,
    traceId: 't',
    userId: 'u',
    recipientPhoneHash: hashRecipientNationalForFraud('93701234567'),
    clientIp: '198.51.100.2',
  });
  const joined = captured.join('\n');
  const noRawPhoneInLogs =
    !joined.includes('93701234567') && !joined.includes('198.51.100');

  await incrementCheckoutVelocitySnapshot({
    userId: `proof_vel_${Date.now()}`,
    ip: '127.0.0.1',
    recipientPhoneHash: hashRecipientNationalForFraud('9370999000'),
    operatorKey: 'mtn',
    amountCents: 500,
    idempotencyKey: randomUUID(),
  });

  const out = {
    ok: true,
    cleanAllowed,
    repeatedIpDetected,
    recipientReplayBlocked,
    idempotencyRotationDetected,
    productionHighRiskBlocked,
    devModeNotBlocked,
    noRawPhoneInLogs,
  };
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify(out));
}

main().catch((e) => {
  // eslint-disable-next-line no-console -- proof contract
  console.log(
    JSON.stringify({
      ok: false,
      error: String(e?.message ?? e),
    }),
  );
  process.exitCode = 1;
});
