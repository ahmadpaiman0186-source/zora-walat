/**
 * High-signal simulations (in-process; no real Redis/Reloadly required).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichPhase1MoneyFindingV2,
  evaluateCheckoutAttemptInconsistency,
  RECON_DIVERGENCE_CODE,
  RECON_RECOMMENDATION,
} from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';

describe('scale-oriented failure simulations', () => {
  it('unknown outcome after hypothetical success path: PROCESSING + latest FAILED + prior SUCCEEDED', () => {
    const r = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.PROCESSING,
      { status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
      1,
    );
    assert.equal(r?.inconsistencyKind, 'processing_latest_failed_after_prior_success');
  });

  it('PRE_HTTP stale finding surfaces VERIFY_FIRST + non-empty playbook', () => {
    const o = enrichPhase1MoneyFindingV2({
      divergenceCode: RECON_DIVERGENCE_CODE.PRE_HTTP_DISPATCH_ARMED_STALE,
      recommendation: RECON_RECOMMENDATION.VERIFY_PROVIDER_EVIDENCE,
      retrySafeHypothesis: false,
    });
    assert.ok(o.operatorPlaybook.length >= 2);
  });
});
