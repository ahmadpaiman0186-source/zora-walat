/**
 * Local proof: Phase 1 money↔fulfillment reconciliation scan + refund safety checklist (read-only).
 *
 * - No Stripe refund API calls.
 * - No Reloadly outbound.
 * - Creates isolated DB fixtures when DATABASE_URL is set (immutable ledger subgraph may remain — CI disposable DB).
 *
 * Run: npm --prefix server run proof:reconciliation-local
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

import { prisma } from '../src/db.js';
import { deleteLedgerJournalForPaymentCheckouts } from '../test/integrations/integrationLedgerTestCleanup.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import { runPhase1MoneyFulfillmentReconciliationScan } from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';
import {
  assessPhase1RefundOperatorChecklist,
  PHASE1_AUTOMATIC_STRIPE_REFUND_FORBIDDEN,
} from '../src/domain/reconciliation/paymentReconciliationRefundSafety.js';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'reconciliation_local', ...obj }));
}

async function main() {
  const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
  if (!dbUrl) {
    proofLine({ ok: false, reason: 'DATABASE_URL_unset' });
    throw new Error('DATABASE_URL_unset');
  }

  const stripeRefundsApiInvoked = false;

  const beforePending = assessPhase1RefundOperatorChecklist({
    status: PAYMENT_CHECKOUT_STATUS.INITIATED,
    postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
  });
  assert.equal(beforePending.mayRequestManualStripeRefundReview, false);

  const afterPaid = assessPhase1RefundOperatorChecklist({
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
  });
  assert.equal(afterPaid.mayRequestManualStripeRefundReview, true);

  const user = await prisma.user.create({
    data: {
      email: `proof_recon_${randomUUID()}@test.invalid`,
      passwordHash: await bcrypt.hash('x', 4),
    },
  });

  const oldPaid = new Date(Date.now() - 400_000);
  const orphan = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      userId: user.id,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.PAID,
      amountUsdCents: 1000,
      currency: 'usd',
      senderCountryCode: 'US',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      productType: 'mobile_topup',
      providerCostUsdCents: 800,
      stripeFeeEstimateUsdCents: 59,
      fxBufferUsdCents: 0,
      riskBufferUsdCents: 0,
      projectedNetMarginBp: 400,
      financialAnomalyCodes: [FINANCIAL_ANOMALY.LOW_MARGIN],
      stripePaymentIntentId: `pi_recon_or_${randomUUID().slice(0, 8)}`,
      completedByWebhookEventId: `evt_recon_or_${randomUUID().slice(0, 8)}`,
      paidAt: oldPaid,
    },
  });

  const dupPi = `pi_recon_dup_${randomUUID().slice(0, 8)}`;
  const dupOrder = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      userId: user.id,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.FULFILLED,
      amountUsdCents: 1000,
      currency: 'usd',
      senderCountryCode: 'US',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      productType: 'mobile_topup',
      providerCostUsdCents: 800,
      stripeFeeEstimateUsdCents: 59,
      fxBufferUsdCents: 0,
      riskBufferUsdCents: 0,
      projectedNetMarginBp: 400,
      financialAnomalyCodes: [FINANCIAL_ANOMALY.LOW_MARGIN],
      stripePaymentIntentId: dupPi,
      completedByWebhookEventId: `evt_recon_dup_${randomUUID().slice(0, 8)}`,
      paidAt: new Date(),
      fulfillmentProviderReference: 'mock_ref',
      fulfillmentProviderKey: 'mock',
    },
  });

  await prisma.fulfillmentAttempt.createMany({
    data: [
      {
        orderId: dupOrder.id,
        attemptNumber: 1,
        status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
        provider: 'mock',
        requestSummary: '{}',
        responseSummary: '{}',
      },
      {
        orderId: dupOrder.id,
        attemptNumber: 2,
        status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
        provider: 'mock',
        requestSummary: '{}',
        responseSummary: '{}',
      },
    ],
  });

  const scan = await runPhase1MoneyFulfillmentReconciliationScan({
    limit: 200,
    paidIdleMs: 60_000,
    now: new Date(),
  });

  const orphanHit = scan.findings.some(
    (f) => f.checkoutId === orphan.id && f.divergenceCode === 'PAID_NO_ATTEMPT',
  );
  assert.equal(orphanHit, true);

  const dupHit = scan.findings.some(
    (f) =>
      f.checkoutId === dupOrder.id &&
      f.divergenceCode === 'INCONSISTENT_ATTEMPT_VS_ORDER' &&
      f.inconsistencyKind === 'multiple_succeeded_attempts',
  );
  assert.equal(dupHit, true);

  proofLine({
    ok: true,
    reconciliationScanSchema: scan.schema,
    findingCount: scan.findings.length,
    orphanPaidNoAttemptDetected: orphanHit,
    duplicateSucceededAttemptsDetected: dupHit,
    refundBeforePaymentDenied: beforePending.mayRequestManualStripeRefundReview === false,
    refundDryRunAfterSettlementAllowedForManualReview:
      afterPaid.mayRequestManualStripeRefundReview === true,
    automaticStripeRefundForbidden: PHASE1_AUTOMATIC_STRIPE_REFUND_FORBIDDEN,
    stripeRefundsApiInvoked,
    policyNote:
      'Engine emits recommendations only; Phase 1 does not call Stripe refunds from recon or fulfillment failure.',
  });

  /**
   * Teardown: L4 journal is immutable with FK RESTRICT; fixtures may gain ledger rows as Phase 1 evolves.
   * Do not delete FulfillmentAttempt / PaymentCheckout / User here — mirrors Sprint 4 integration posture.
   */
  await deleteLedgerJournalForPaymentCheckouts(prisma, [orphan.id, dupOrder.id]);
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
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    process.exit(code);
  }
})();
