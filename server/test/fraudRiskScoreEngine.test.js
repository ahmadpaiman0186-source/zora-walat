import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRiskDecisionPayload,
  classifyRisk,
  computeCheckoutRiskScore,
} from '../src/fraud/riskScoreEngine.js';

const baseVel = () => ({
  userCount: 1,
  ipCount: 1,
  recipientKeyCount: 1,
  operatorIpCount: 1,
  amountIpCount: 1,
  distinctRecipientsOnIp: 1,
  distinctIdempotencyKeys: 1,
});

test('clean checkout → allow', () => {
  const r = buildRiskDecisionPayload({
    traceId: 't1',
    abuseSeverity: 'low',
    abuseReasonCodes: [],
    velocity: baseVel(),
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.equal(r.decision, 'allow');
  assert.equal(r.severity, 'low');
});

test('repeated IP checkout → medium then higher severity as counts rise', () => {
  const low = computeCheckoutRiskScore({
    traceId: null,
    abuseSeverity: 'low',
    abuseReasonCodes: [],
    velocity: { ...baseVel(), ipCount: 3 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.ok(low.score < 38);

  const reviewPayload = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'medium',
    abuseReasonCodes: ['excessive_ip_attempts'],
    velocity: { ...baseVel(), ipCount: 5 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.equal(reviewPayload.decision, 'review');
  assert.equal(reviewPayload.severity, 'medium');

  const hi = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'high',
    abuseReasonCodes: ['excessive_ip_attempts'],
    velocity: { ...baseVel(), ipCount: 12 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.equal(hi.decision, 'block');
  assert.equal(hi.severity, 'high');
});

test('repeated recipient / IP replay signals → high block', () => {
  const r = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'high',
    abuseReasonCodes: ['excessive_recipient_ip_replay'],
    velocity: { ...baseVel(), recipientKeyCount: 9, ipCount: 3 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.equal(r.decision, 'block');
  assert.ok(r.reasonCodes.some((c) => c.includes('recipient')));
});

test('idempotency key rotation → high block', () => {
  const r = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'medium',
    abuseReasonCodes: ['idempotency_key_rotation'],
    velocity: { ...baseVel(), distinctIdempotencyKeys: 5, ipCount: 2 },
    amountPackageMismatch: false,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.equal(r.decision, 'block');
});

test('invalid amount/package mismatch → block', () => {
  const r = buildRiskDecisionPayload({
    traceId: null,
    abuseSeverity: 'low',
    abuseReasonCodes: [],
    velocity: baseVel(),
    amountPackageMismatch: true,
    policyRequiresVerifiedEmail: true,
    emailVerified: true,
    isLocalProofIdentity: false,
  });
  assert.equal(r.decision, 'block');
  assert.ok(r.reasonCodes.includes('amount_package_mismatch'));
});

test('classifyRisk respects score ordering', () => {
  assert.equal(classifyRisk(10, []).decision, 'allow');
  assert.equal(classifyRisk(40, []).decision, 'review');
  assert.equal(classifyRisk(80, []).decision, 'block');
});
