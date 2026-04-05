import test from 'node:test';
import assert from 'node:assert/strict';

import { detectFailureConfidence } from '../src/domain/fulfillment/failureConfidence.js';
import { FAILURE_CONFIDENCE } from '../src/constants/failureConfidence.js';
import {
  AIRTIME_OUTCOME,
  AIRTIME_ERROR_KIND,
} from '../src/domain/fulfillment/airtimeFulfillmentResult.js';

test('detectFailureConfidence: diagnostic-only body → unknown', () => {
  assert.equal(
    detectFailureConfidence(null, [], {
      outcome: AIRTIME_OUTCOME.FAILURE,
      responseSummary: { diagnostic: 'x' },
    }),
    FAILURE_CONFIDENCE.UNKNOWN,
  );
});

test('detectFailureConfidence: timeout / retryable → weak_failure', () => {
  assert.equal(
    detectFailureConfidence(null, [], {
      outcome: AIRTIME_OUTCOME.FAILURE,
      errorKind: AIRTIME_ERROR_KIND.TIMEOUT,
      responseSummary: { outcome: 'failure', httpStatus: 500 },
    }),
    FAILURE_CONFIDENCE.WEAK_FAILURE,
  );
});

test('detectFailureConfidence: explicit failed outcome in summary + not retryable → strong_failure', () => {
  assert.equal(
    detectFailureConfidence(null, [], {
      outcome: AIRTIME_OUTCOME.FAILURE,
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      responseSummary: {
        outcome: 'failure',
        status: 'DECLINED',
        httpStatus: 200,
      },
    }),
    FAILURE_CONFIDENCE.STRONG_FAILURE,
  );
});
