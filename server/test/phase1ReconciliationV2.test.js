import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichPhase1MoneyFindingV2,
  RECON_DIVERGENCE_CODE,
  RECON_RECOMMENDATION,
  RECON_V2_ACTION,
} from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';

describe('Phase 1 money reconciliation V2 — enrichPhase1MoneyFindingV2', () => {
  it('maps safe queue retry to SAFE_RETRY', () => {
    const o = enrichPhase1MoneyFindingV2({
      divergenceCode: RECON_DIVERGENCE_CODE.PAID_NO_ATTEMPT,
      recommendation: RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE,
      retrySafeHypothesis: true,
    });
    assert.equal(o.actionV2, RECON_V2_ACTION.SAFE_RETRY);
    assert.match(String(o.explain), /actionV2=SAFE_RETRY/);
  });

  it('maps orphan success to BLOCKED_UNTIL_CONFIRMATION', () => {
    const o = enrichPhase1MoneyFindingV2({
      divergenceCode: RECON_DIVERGENCE_CODE.ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED,
      recommendation: RECON_RECOMMENDATION.MANUAL_REVIEW,
      retrySafeHypothesis: false,
    });
    assert.equal(o.actionV2, RECON_V2_ACTION.BLOCKED_UNTIL_CONFIRMATION);
  });

  it('maps inconsistent attempt vs order to BLOCKED_UNTIL_CONFIRMATION', () => {
    const o = enrichPhase1MoneyFindingV2({
      divergenceCode: RECON_DIVERGENCE_CODE.INCONSISTENT_ATTEMPT_VS_ORDER,
      recommendation: RECON_RECOMMENDATION.MANUAL_REVIEW,
      retrySafeHypothesis: false,
    });
    assert.equal(o.actionV2, RECON_V2_ACTION.BLOCKED_UNTIL_CONFIRMATION);
    assert.ok(Array.isArray(o.operatorPlaybook));
    assert.ok(o.operatorPlaybook.length >= 1);
  });

  it('pre-HTTP armed stale maps to VERIFY + playbook mentions crash-ordering', () => {
    const o = enrichPhase1MoneyFindingV2({
      divergenceCode: RECON_DIVERGENCE_CODE.PRE_HTTP_DISPATCH_ARMED_STALE,
      recommendation: RECON_RECOMMENDATION.VERIFY_PROVIDER_EVIDENCE,
      retrySafeHypothesis: false,
    });
    assert.equal(o.actionV2, RECON_V2_ACTION.VERIFY_PROVIDER_FIRST);
    assert.ok(
      o.operatorPlaybook.some((s) => /crash-ordering|pre-HTTP/i.test(s)),
    );
  });
});
