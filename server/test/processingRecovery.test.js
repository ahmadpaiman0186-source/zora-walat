import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySandboxRetrySuppressionPolicy,
  classifyStuckRecovery,
} from '../src/services/processingRecoveryService.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';

function att(overrides) {
  return {
    id: 'a1',
    status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
    providerReference: null,
    requestSummary: JSON.stringify({ phase: 'queued' }),
    responseSummary: null,
    ...overrides,
  };
}

test('classifyStuckRecovery: queued-only request → revert_paid', () => {
  assert.equal(classifyStuckRecovery(att({})), 'revert_paid');
});

test('classifyStuckRecovery: provider reference → retry_new_attempt', () => {
  assert.equal(
    classifyStuckRecovery(att({ providerReference: 'prv_123' })),
    'retry_new_attempt',
  );
});

test('classifyStuckRecovery: non-empty response → retry_new_attempt', () => {
  assert.equal(
    classifyStuckRecovery(
      att({ responseSummary: JSON.stringify({ ok: true }) }),
    ),
    'retry_new_attempt',
  );
});

test('classifyStuckRecovery: rich request summary → retry_new_attempt', () => {
  assert.equal(
    classifyStuckRecovery(
      att({
        requestSummary: JSON.stringify({
          phase: 'x',
          body: { a: 1 },
        }),
      }),
    ),
    'retry_new_attempt',
  );
});

test('classifyStuckRecovery: Reloadly pending proof → manual_review (no duplicate retry)', () => {
  assert.equal(
    classifyStuckRecovery(
      att({
        providerReference: 'reloadly_tx_1',
        responseSummary: JSON.stringify({
          normalizedOutcome: 'pending_verification',
          proofClassification: 'pending_provider',
        }),
      }),
    ),
    'manual_review',
  );
});

test('applySandboxRetrySuppressionPolicy: pass-through when conservative flag off', () => {
  assert.deepEqual(
    applySandboxRetrySuppressionPolicy('retry_new_attempt', {
      processingRecoverySandboxConservative: false,
      reloadlySandbox: true,
      airtimeProvider: 'reloadly',
    }),
    { path: 'retry_new_attempt', manualReviewOverride: null },
  );
});

test('applySandboxRetrySuppressionPolicy: manual_review when sandbox drill trio', () => {
  const r = applySandboxRetrySuppressionPolicy('retry_new_attempt', {
    processingRecoverySandboxConservative: true,
    reloadlySandbox: true,
    airtimeProvider: 'reloadly',
  });
  assert.equal(r.path, 'manual_review');
  assert.equal(r.manualReviewOverride?.reason, 'sandbox_auto_retry_suppressed');
  assert.equal(r.manualReviewOverride?.classification, 'sandbox_duplicate_send_guard');
});

test('applySandboxRetrySuppressionPolicy: non-retry paths unchanged', () => {
  assert.deepEqual(
    applySandboxRetrySuppressionPolicy('manual_review', {
      processingRecoverySandboxConservative: true,
      reloadlySandbox: true,
      airtimeProvider: 'reloadly',
    }),
    { path: 'manual_review', manualReviewOverride: null },
  );
});
