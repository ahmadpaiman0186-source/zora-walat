/**
 * Local proof: checkout velocity classifier, package/amount gates, OTP risk hook, audit redaction.
 * No Stripe calls. Optional DATABASE_URL not required.
 *
 * Run: npm --prefix server run proof:fraud-controls-local
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  resolveTrustedAmountUsdCents,
  validatePackageOperatorPair,
} from '../src/lib/allowedCheckout.js';
import { checkoutAbuseBlockHighSeverityImmediately } from '../src/lib/fraudControlsPolicy.js';
import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { env } from '../src/config/env.js';
import { classifyCheckoutAbuse } from '../src/services/checkoutAbuseDetector.js';
import { evaluateRisk } from '../src/services/risk/riskEngine.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'fraud_controls_local', ...obj }));
}

async function main() {
  const once = classifyCheckoutAbuse({
    userId: `proof_u_${randomUUID()}`,
    ip: '127.0.0.1',
    fingerprint: 'proof_fp',
    idempotencyKey: randomUUID(),
    recipientNational: null,
    now: new Date(),
  });
  assert.equal(once.severity, 'low');

  const uid = `proof_hf_${randomUUID()}`;
  const ip = '127.0.0.2';
  const t0 = Date.now();
  let hf;
  for (let i = 0; i < 8; i++) {
    hf = classifyCheckoutAbuse({
      userId: uid,
      ip,
      fingerprint: `hf_fp_${i}`,
      idempotencyKey: randomUUID(),
      recipientNational: null,
      now: new Date(t0 + i * 100),
    });
  }
  assert.equal(hf.severity, 'high');

  const badPkg = validatePackageOperatorPair('mtn_x', 'roshan');
  assert.equal(badPkg.ok, false);

  const badAmt = resolveTrustedAmountUsdCents({
    packageId: null,
    amountUsdCents: 777777,
  });
  assert.equal(badAmt.ok, false);

  const otpDeny = evaluateRisk({
    kind: 'otp_request',
    flags: { otpIpVelocityExceeded: true },
  });
  assert.equal(otpDeny.decision, 'deny');
  assert.equal(otpDeny.reasonCode, RISK_REASON_CODE.OTP_ABUSE);

  const rows = [];
  await writeOrderAudit(
    {
      auditLog: {
        create: async ({ data }) => {
          rows.push(data);
          return data;
        },
      },
    },
    {
      event: 'proof_fraud_redaction',
      payload: { stripeWebhookSecret: 'whsec_proof_dummy', x: 1 },
      ip: null,
    },
  );
  assert.equal(rows[0].payload.includes('whsec_'), false);

  proofLine({
    ok: true,
    nodeEnv: env.nodeEnv,
    normalCheckoutSeverity: once.severity,
    highFrequencySeverity: hf.severity,
    strictHighBlock: checkoutAbuseBlockHighSeverityImmediately(),
    invalidPackageRejected: true,
    invalidAmountRejected: true,
    otpVelocityDenied: true,
    auditRedactionOk: true,
  });
}

(async () => {
  let code = 0;
  try {
    await main();
  } catch (err) {
    code = 1;
    proofLine({
      ok: false,
      error: typeof err?.message === 'string' ? err.message.slice(0, 200) : String(err),
    });
  } finally {
    process.exit(code);
  }
})();
