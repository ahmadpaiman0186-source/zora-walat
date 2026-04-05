import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyStuckRecovery } from '../src/services/processingRecoveryService.js';
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
