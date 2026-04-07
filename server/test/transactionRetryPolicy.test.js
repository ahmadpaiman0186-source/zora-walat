import ass from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TRANSACTION_FAILURE_CLASS } from '../src/constants/transactionFailureClass.js';
import { transactionRetryDirective } from '../src/lib/transactionRetryPolicy.js';

describe('transactionRetryPolicy', () => {
  it('transient DB: may retry until max with backoff', () => {
    const a0 = transactionRetryDirective(TRANSACTION_FAILURE_CLASS.TRANSIENT_DB, {
      attempt: 0,
    });
    ass.equal(a0.mayScheduleRetry, true);
    ass.ok(typeof a0.suggestedBackoffMs === 'number' && a0.suggestedBackoffMs > 0);
    const a9 = transactionRetryDirective(TRANSACTION_FAILURE_CLASS.TRANSIENT_DB, {
      attempt: 9,
    });
    ass.equal(a9.mayScheduleRetry, false);
  });

  it('duplicate blocked: never retry', () => {
    const d = transactionRetryDirective(
      TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED,
      { attempt: 0 },
    );
    ass.equal(d.mayScheduleRetry, false);
    ass.equal(d.reason, 'duplicate_idempotent_guard');
  });

  it('validation / manual review: never retry', () => {
    const v = transactionRetryDirective(
      TRANSACTION_FAILURE_CLASS.PERMANENT_VALIDATION,
      { attempt: 0 },
    );
    ass.equal(v.mayScheduleRetry, false);
    const m = transactionRetryDirective(
      TRANSACTION_FAILURE_CLASS.MANUAL_REVIEW_REQUIRED,
      { attempt: 0 },
    );
    ass.equal(m.mayScheduleRetry, false);
  });

  it('unknown: not scheduled', () => {
    const u = transactionRetryDirective(TRANSACTION_FAILURE_CLASS.UNKNOWN, {
      attempt: 0,
    });
    ass.equal(u.mayScheduleRetry, false);
  });
});
