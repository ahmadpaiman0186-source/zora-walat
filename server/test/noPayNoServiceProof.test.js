/**
 * CORE-06 no-pay-no-service runtime proof — pure unit tests (no DB, no env, no APIs).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateNoPayNoServiceDelivery,
  evaluateNoPayNoServiceBatch,
  buildProofReport,
  DELIVERY_DECISION,
  deliveryDecisionToDoctorFinding,
  hasPaymentProof,
  hasProviderSuccessProof,
} from '../src/reliability/noPayNoServiceProof/index.js';
import {
  healthyPaymentProviderAudit,
  paidNoProviderProof,
  providerSuccessNoPayment,
  completedWithoutProviderRef,
  providerTimeoutAmbiguous,
  deliveredFlagNoPayment,
  deliveredFlagNoProvider,
  duplicateIdempotencyRisk,
  missingAuditEvent,
  stalePendingPaid,
  failedPaymentNoProvider,
  sandboxNonMoneyProof,
} from './fixtures/noPayNoServiceProof/bundles.mjs';

function assertNoMutation(d) {
  assert.equal(d.mutationAllowed, false);
}

describe('CORE-06 proof evaluators', () => {
  it('hasPaymentProof and hasProviderSuccessProof', () => {
    assert.equal(hasPaymentProof({ stripePaid: true }), true);
    assert.equal(hasProviderSuccessProof({ hasSuccessProof: true }), true);
  });
});

describe('fixture a — healthy payment + provider + audit', () => {
  it('ALLOW_DELIVERY', () => {
    const d = evaluateNoPayNoServiceDelivery(healthyPaymentProviderAudit);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.ALLOW_DELIVERY);
    assert.equal(d.code, 'CORE6-ALLOW-001');
  });
});

describe('fixture b — paid, provider proof missing', () => {
  it('PENDING_REVIEW', () => {
    const d = evaluateNoPayNoServiceDelivery(paidNoProviderProof);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.PENDING_REVIEW);
    assert.equal(d.code, 'CORE6-PAID-NO-PRV-001');
  });
});

describe('fixture c — provider success, payment missing', () => {
  it('BLOCK_NO_PAYMENT', () => {
    const d = evaluateNoPayNoServiceDelivery(providerSuccessNoPayment);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.BLOCK_NO_PAYMENT);
    assert.equal(d.code, 'CORE6-PRV-NO-PAY-001');
  });
});

describe('fixture d — completed without provider reference', () => {
  it('BLOCK_AMBIGUOUS', () => {
    const d = evaluateNoPayNoServiceDelivery(completedWithoutProviderRef);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.BLOCK_AMBIGUOUS);
    assert.equal(d.code, 'CORE6-FULFILLED-NO-REF-001');
  });
});

describe('fixture e — provider timeout / ambiguous', () => {
  it('BLOCK_AMBIGUOUS', () => {
    const d = evaluateNoPayNoServiceDelivery(providerTimeoutAmbiguous);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.BLOCK_AMBIGUOUS);
    assert.equal(d.code, 'CORE6-PRV-AMBIG-001');
  });
});

describe('fixture f — delivered flag, no payment', () => {
  it('BLOCK_NO_PAYMENT', () => {
    const d = evaluateNoPayNoServiceDelivery(deliveredFlagNoPayment);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.BLOCK_NO_PAYMENT);
    assert.equal(d.code, 'CORE6-NPAY-DELIVERED-001');
  });
});

describe('fixture g — delivered flag, no provider proof', () => {
  it('BLOCK_NO_PROVIDER_PROOF', () => {
    const d = evaluateNoPayNoServiceDelivery(deliveredFlagNoProvider);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.BLOCK_NO_PROVIDER_PROOF);
    assert.equal(d.code, 'CORE6-NOPRV-DELIVERED-001');
  });
});

describe('fixture h — duplicate / idempotency risk', () => {
  it('FAIL_CLOSED on duplicate risk', () => {
    const d = evaluateNoPayNoServiceDelivery(duplicateIdempotencyRisk);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.FAIL_CLOSED);
    assert.equal(d.code, 'CORE6-IDEM-FAIL-001');
  });
});

describe('fixture i — missing audit event', () => {
  it('FAIL_CLOSED when paid + provider proof but audit incomplete', () => {
    const d = evaluateNoPayNoServiceDelivery(missingAuditEvent);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.FAIL_CLOSED);
    assert.equal(d.code, 'CORE6-AUDIT-FAIL-001');
  });
});

describe('fixture j — stale pending with payment success', () => {
  it('PENDING_REVIEW', () => {
    const d = evaluateNoPayNoServiceDelivery(stalePendingPaid);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.PENDING_REVIEW);
    assert.equal(d.code, 'CORE6-STALE-PENDING-001');
  });
});

describe('fixture k — failed payment, provider not executed', () => {
  it('FAIL_CLOSED safe path', () => {
    const d = evaluateNoPayNoServiceDelivery(failedPaymentNoProvider);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.FAIL_CLOSED);
    assert.equal(d.code, 'CORE6-FAILED-NO-PRV-001');
  });
});

describe('fixture l — sandbox non-money proof', () => {
  it('ALLOW_DELIVERY for sandbox fixture only', () => {
    const d = evaluateNoPayNoServiceDelivery(sandboxNonMoneyProof);
    assertNoMutation(d);
    assert.equal(d.decision, DELIVERY_DECISION.ALLOW_DELIVERY);
    assert.equal(d.code, 'CORE6-SANDBOX-ALLOW-001');
  });
});

describe('mutationAllowed safety', () => {
  it('false on all fixture decisions', () => {
    const bundles = [
      healthyPaymentProviderAudit,
      paidNoProviderProof,
      providerSuccessNoPayment,
      completedWithoutProviderRef,
      providerTimeoutAmbiguous,
      deliveredFlagNoPayment,
      deliveredFlagNoProvider,
      duplicateIdempotencyRisk,
      missingAuditEvent,
      stalePendingPaid,
      failedPaymentNoProvider,
      sandboxNonMoneyProof,
    ];
    for (const d of evaluateNoPayNoServiceBatch(bundles)) {
      assertNoMutation(d);
    }
  });
});

describe('doctor export boundary', () => {
  it('maps non-ALLOW decisions to doctor findings without mutating doctor', () => {
    const d = evaluateNoPayNoServiceDelivery(paidNoProviderProof);
    const finding = deliveryDecisionToDoctorFinding(d);
    assert.ok(finding);
    assert.equal(finding.mutationAllowed, false);
    assert.ok(finding.id.startsWith('CORE4-NPNS6-'));
  });

  it('returns null for ALLOW_DELIVERY', () => {
    const d = evaluateNoPayNoServiceDelivery(healthyPaymentProviderAudit);
    assert.equal(deliveryDecisionToDoctorFinding(d), null);
  });
});

describe('proof report safety', () => {
  it('never_mark_delivered_in_module', () => {
    const report = buildProofReport(evaluateNoPayNoServiceDelivery(healthyPaymentProviderAudit));
    assert.equal(report.safety.never_mark_delivered_in_module, true);
    assert.equal(report.autoRepairApplyEnabled, false);
  });
});
