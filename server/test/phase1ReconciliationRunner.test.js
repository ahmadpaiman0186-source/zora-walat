import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import {
  runPhase1ReconciliationReport,
  PHASE1_RECONCILIATION_RUNNER_VERSION,
} from '../src/domain/reconciliation/phase1ReconciliationRunner.js';
import { PHASE1_RECONCILIATION_DRIFT_CODES } from '../src/domain/reconciliation/phase1MoneyTruthReconciliation.js';

describe('phase1ReconciliationRunner', () => {
  it('report_only policy — aligned state', () => {
    const report = runPhase1ReconciliationReport(
      {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        stripePaymentIntentId: 'pi_x',
      },
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.QUEUED }],
    );
    assert.equal(report.aligned, true);
    assert.equal(report.mutationPolicy, 'report_only');
    assert.equal(report.runnerVersion, PHASE1_RECONCILIATION_RUNNER_VERSION);
    assert.ok(report.driftCodeCatalogVersion >= 1);
  });

  it('surfaces drift codes without mutation fields', () => {
    const report = runPhase1ReconciliationReport(
      {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
        stripePaymentIntentId: 'pi_x',
      },
      [],
    );
    assert.equal(report.aligned, false);
    assert.ok(
      report.driftCodes.includes(
        PHASE1_RECONCILIATION_DRIFT_CODES.ORDER_PAID_PAYMENT_ROW_NOT_SUCCEEDED,
      ),
    );
    assert.equal(report.mutationPolicy, 'report_only');
  });
});
