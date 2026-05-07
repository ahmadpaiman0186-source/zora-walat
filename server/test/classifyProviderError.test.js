import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AIRTIME_ERROR_KIND } from '../src/domain/fulfillment/airtimeFulfillmentResult.js';
import {
  classifyProviderError,
  safeErrorDiagnostics,
} from '../src/domain/fulfillment/classifyProviderError.js';

describe('classifyProviderError', () => {
  it('maps AbortError / timeout-shaped messages to TIMEOUT', () => {
    const a = classifyProviderError({ name: 'AbortError', message: 'aborted' });
    assert.equal(a.errorKind, AIRTIME_ERROR_KIND.TIMEOUT);
    assert.equal(a.failureCode, 'provider_timeout');
    const b = classifyProviderError({ message: 'upstream Timeout exceeded' });
    assert.equal(b.errorKind, AIRTIME_ERROR_KIND.TIMEOUT);
  });

  it('maps socket errno codes to NETWORK', () => {
    const r = classifyProviderError({ code: 'ECONNREFUSED', message: 'refused' });
    assert.equal(r.errorKind, AIRTIME_ERROR_KIND.NETWORK);
    assert.equal(r.failureCode, 'provider_network_error');
  });

  it('defaults unknown exceptions to UNKNOWN', () => {
    const r = classifyProviderError({ message: 'something else' });
    assert.equal(r.errorKind, AIRTIME_ERROR_KIND.UNKNOWN);
    assert.equal(r.failureCode, 'provider_exception');
  });
});

describe('safeErrorDiagnostics', () => {
  it('includes only safe errno/code/name fields', () => {
    const d = safeErrorDiagnostics({
      errno: -54,
      code: 'ECONNRESET',
      name: 'Error',
      stack: 'secret',
      response: { body: 'secret' },
    });
    assert.equal(d.errno, -54);
    assert.equal(d.code, 'ECONNRESET');
    assert.equal(d.name, 'Error');
    assert.equal(d.stack, undefined);
  });
});
