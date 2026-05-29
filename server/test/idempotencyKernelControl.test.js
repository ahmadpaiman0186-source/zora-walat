/**
 * CORE-05 idempotency control kernel — pure unit tests (no DB, no env, no APIs).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyIdempotencyAttempt,
  createIdempotencyRegistry,
  DECISION,
  seedIdempotencyRegistry,
  validateKeyMaterial,
  buildKernelReport,
} from '../src/reliability/idempotencyKernel/index.js';
import {
  duplicateCheckoutAttempt,
  duplicateCheckoutSeed,
  duplicateWebhookAttempt,
  duplicateWebhookSeed,
  duplicateProviderExecutionAttempt,
  duplicateProviderExecutionSeed,
  duplicateProviderReferenceAttempt,
  duplicateProviderReferenceSeed,
  retryAfterProviderTimeout,
  retryAfterProviderSuccess,
  missingIdempotencyKeyMaterial,
  stalePendingOrderRetry,
  healthyFirstAttempt,
  paymentSucceededProviderProofMissing,
  completedOrderWithoutProviderProof,
} from './fixtures/idempotencyKernel/attempts.mjs';

function assertNoMutation(decision) {
  assert.equal(decision.mutationAllowed, false);
}

describe('CORE-05 idempotency kernel scaffold', () => {
  it('validateKeyMaterial rejects missing anchors', () => {
    const r = validateKeyMaterial({
      scope: 'checkout',
      source: 'client',
      type: 'create_session',
    });
    assert.equal(r.ok, false);
  });

  it('all decisions default mutationAllowed false', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(healthyFirstAttempt, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.ALLOW);
  });
});

describe('fixture a — duplicate checkout attempt', () => {
  it('BLOCK_DUPLICATE when same idempotency key already completed', () => {
    const reg = seedIdempotencyRegistry(createIdempotencyRegistry(), [duplicateCheckoutSeed]);
    const d = classifyIdempotencyAttempt(duplicateCheckoutAttempt, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_DUPLICATE);
    assert.equal(d.code, 'CORE5-DUP-CHK-001');
  });
});

describe('fixture b — duplicate webhook event id', () => {
  it('BLOCK_DUPLICATE on replayed Stripe event', () => {
    const reg = seedIdempotencyRegistry(createIdempotencyRegistry(), [duplicateWebhookSeed]);
    const d = classifyIdempotencyAttempt(duplicateWebhookAttempt, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_DUPLICATE);
    assert.equal(d.code, 'CORE5-DUP-WH-001');
  });
});

describe('fixture c — duplicate provider execution attempt', () => {
  it('BLOCK_DUPLICATE after prior success retry', () => {
    const reg = seedIdempotencyRegistry(createIdempotencyRegistry(), [
      duplicateProviderExecutionSeed,
    ]);
    const d = classifyIdempotencyAttempt(duplicateProviderExecutionAttempt, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_DUPLICATE);
    assert.ok(['CORE5-DUP-PRVEXEC-001', 'CORE5-RETRY-AFTER-SUCCESS-001'].includes(d.code));
  });
});

describe('fixture d — duplicate provider reference', () => {
  it('BLOCK_DUPLICATE when reference bound to another order', () => {
    const reg = seedIdempotencyRegistry(createIdempotencyRegistry(), [
      duplicateProviderReferenceSeed,
    ]);
    const d = classifyIdempotencyAttempt(duplicateProviderReferenceAttempt, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_DUPLICATE);
    assert.equal(d.code, 'CORE5-DUP-PRVREF-001');
  });
});

describe('fixture e — retry after provider timeout', () => {
  it('RETRY_UNSAFE when prior state ambiguous', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(retryAfterProviderTimeout, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.RETRY_UNSAFE);
    assert.equal(d.code, 'CORE5-RETRY-UNSAFE-001');
  });
});

describe('fixture f — retry after provider success', () => {
  it('BLOCK_DUPLICATE — never redispatch after success', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(retryAfterProviderSuccess, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_DUPLICATE);
    assert.equal(d.code, 'CORE5-RETRY-AFTER-SUCCESS-001');
  });
});

describe('fixture g — missing idempotency key material', () => {
  it('BLOCK_AMBIGUOUS when anchors absent', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(missingIdempotencyKeyMaterial, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_AMBIGUOUS);
    assert.equal(d.code, 'CORE5-KEY-001');
  });
});

describe('fixture h — stale pending order retry', () => {
  it('RETRY_UNSAFE beyond stale threshold', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(stalePendingOrderRetry, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.RETRY_UNSAFE);
    assert.equal(d.code, 'CORE5-STALE-PENDING-001');
  });
});

describe('fixture i — healthy first attempt', () => {
  it('ALLOW with no block decision', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(healthyFirstAttempt, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.ALLOW);
    assert.ok(d.idempotencyKey?.includes('idem_healthy_first'));
  });
});

describe('fixture j — payment succeeded, provider proof missing', () => {
  it('PENDING_REVIEW — fail closed', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(paymentSucceededProviderProofMissing, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.PENDING_REVIEW);
    assert.equal(d.code, 'CORE5-PAID-NO-PROOF-001');
  });
});

describe('fixture k — completed order without provider proof', () => {
  it('BLOCK_AMBIGUOUS — never mark delivered', () => {
    const reg = createIdempotencyRegistry();
    const d = classifyIdempotencyAttempt(completedOrderWithoutProviderProof, reg);
    assertNoMutation(d);
    assert.equal(d.decision, DECISION.BLOCK_AMBIGUOUS);
    assert.equal(d.code, 'CORE5-FULFILLED-NO-PROOF-001');
  });
});

describe('mutationAllowed safety', () => {
  it('never true across all fixture decisions', () => {
    const reg = seedIdempotencyRegistry(createIdempotencyRegistry(), [
      duplicateCheckoutSeed,
      duplicateWebhookSeed,
      duplicateProviderReferenceSeed,
    ]);
    const contexts = [
      duplicateCheckoutAttempt,
      duplicateWebhookAttempt,
      duplicateProviderReferenceAttempt,
      retryAfterProviderTimeout,
      retryAfterProviderSuccess,
      missingIdempotencyKeyMaterial,
      stalePendingOrderRetry,
      healthyFirstAttempt,
      paymentSucceededProviderProofMissing,
      completedOrderWithoutProviderProof,
    ];
    const report = buildKernelReport(
      contexts.map((ctx) => classifyIdempotencyAttempt(ctx, reg)),
    );
    assert.equal(report.classifyOnly, true);
    assert.equal(report.autoRepairApplyEnabled, false);
    for (const d of report.decisions) {
      assertNoMutation(d);
    }
  });
});
