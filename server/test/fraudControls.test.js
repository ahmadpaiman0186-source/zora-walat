import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, test } from 'node:test';

import {
  resolveTrustedAmountUsdCents,
  validatePackageOperatorPair,
} from '../src/lib/allowedCheckout.js';
import { checkoutAbuseBlockHighSeverityImmediately } from '../src/lib/fraudControlsPolicy.js';
import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { classifyCheckoutAbuse } from '../src/services/checkoutAbuseDetector.js';
import { evaluateRisk } from '../src/services/risk/riskEngine.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';

describe('fraud / abuse controls', () => {
  const savedRelax = process.env.CHECKOUT_ABUSE_RELAX_DEV;
  const savedStrict = process.env.CHECKOUT_ABUSE_STRICT;

  afterEach(() => {
    if (savedRelax === undefined) delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
    else process.env.CHECKOUT_ABUSE_RELAX_DEV = savedRelax;
    if (savedStrict === undefined) delete process.env.CHECKOUT_ABUSE_STRICT;
    else process.env.CHECKOUT_ABUSE_STRICT = savedStrict;
  });

  test('single checkout attempt is low severity (normal path)', () => {
    const now = new Date();
    const r = classifyCheckoutAbuse({
      userId: `u_${randomUUID()}`,
      ip: '10.0.0.1',
      fingerprint: 'fp_a',
      idempotencyKey: randomUUID(),
      recipientNational: null,
      now,
    });
    assert.equal(r.severity, 'low');
  });

  test('high-frequency checkout from same user+IP hits high severity', () => {
    const userId = `u_hf_${randomUUID()}`;
    const ip = '10.0.0.2';
    const t0 = new Date('2026-01-01T12:00:00.000Z').getTime();
    let last;
    for (let i = 0; i < 8; i++) {
      last = classifyCheckoutAbuse({
        userId,
        ip,
        fingerprint: `fp_${i}`,
        idempotencyKey: randomUUID(),
        recipientNational: null,
        now: new Date(t0 + i * 100),
      });
    }
    assert.equal(last.severity, 'high');
    assert.ok(last.reasonCodes.includes('excessive_user_ip_attempts'));
  });

  test('repeated recipient + same IP across users elevates (recipient top-up replay)', () => {
    const ip = '10.0.0.55';
    const recip = '7012345678';
    const t0 = new Date('2026-06-01T00:00:00Z').getTime();
    let last;
    for (let i = 0; i < 16; i++) {
      last = classifyCheckoutAbuse({
        userId: `u_rip_${randomUUID()}_${i}`,
        ip,
        fingerprint: `fpx_${i}_${randomUUID().slice(0, 8)}`,
        idempotencyKey: randomUUID(),
        recipientNational: recip,
        now: new Date(t0 + i * 50),
      });
    }
    assert.equal(last.severity, 'high');
    assert.ok(last.reasonCodes.includes('excessive_recipient_ip_replay'));
  });

  test('OTP abuse: risk engine denies when email velocity flag is set', () => {
    const r = evaluateRisk({
      kind: 'otp_request',
      flags: { otpEmailVelocityExceeded: true },
    });
    assert.equal(r.decision, 'deny');
    assert.equal(r.reasonCode, RISK_REASON_CODE.OTP_ABUSE);
  });

  test('invalid package vs operator is rejected', () => {
    const p = validatePackageOperatorPair('mtn_pkg_x', 'roshan');
    assert.equal(p.ok, false);
  });

  test('abnormal amount (not on allowed ladder) is rejected', () => {
    const p = resolveTrustedAmountUsdCents({
      packageId: null,
      amountUsdCents: 999001,
    });
    assert.equal(p.ok, false);
  });

  test('checkout strict-high block env gates behave', () => {
    process.env.CHECKOUT_ABUSE_RELAX_DEV = 'true';
    delete process.env.CHECKOUT_ABUSE_STRICT;
    assert.equal(checkoutAbuseBlockHighSeverityImmediately(), false);

    delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
    process.env.CHECKOUT_ABUSE_STRICT = 'true';
    assert.equal(checkoutAbuseBlockHighSeverityImmediately(), true);
  });

  test('audit payload redaction still strips webhook-style secrets', async () => {
    const rows = [];
    const db = {
      auditLog: {
        create: async ({ data }) => {
          rows.push(data);
          return data;
        },
      },
    };
    await writeOrderAudit(db, {
      event: 'fraud_controls_audit_probe',
      payload: {
        stripeWebhookSecret: 'whsec_test_redaction_only',
        ok: true,
      },
      ip: null,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload.includes('whsec_'), false);
  });
});
