/**
 * L22 — HTTP correlation ALS vs worker `runWithTrace` ALS share `getTraceId()`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { correlationStorage } from '../src/lib/correlationContext.js';
import { getTraceId, runWithTrace } from '../src/lib/requestContext.js';

describe('getTraceId correlation bridge (L22)', () => {
  it('reads traceId from correlation when worker trace ALS is empty', () => {
    correlationStorage.run(
      {
        traceId: 'corr-http-trace',
        requestId: 'req-1',
        orderId: null,
        attemptId: null,
        surface: 'api',
      },
      () => {
        assert.equal(getTraceId(), 'corr-http-trace');
      },
    );
  });

  it('prefers runWithTrace store over correlation', () => {
    correlationStorage.run(
      {
        traceId: 'corr-layer',
        requestId: 'req-2',
        orderId: null,
        attemptId: null,
        surface: 'worker',
      },
      () => {
        runWithTrace('worker-bound-trace', () => {
          assert.equal(getTraceId(), 'worker-bound-trace');
        });
      },
    );
  });
});
