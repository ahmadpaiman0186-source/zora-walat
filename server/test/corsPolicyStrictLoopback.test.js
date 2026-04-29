import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isStrictLoopbackHttpOrigin } from '../src/lib/corsPolicy.js';

test('isStrictLoopbackHttpOrigin allows http localhost and 127.0.0.1 with any port', () => {
  assert.equal(isStrictLoopbackHttpOrigin('http://localhost:55555'), true);
  assert.equal(isStrictLoopbackHttpOrigin('http://127.0.0.1:1'), true);
});

test('isStrictLoopbackHttpOrigin rejects https on loopback (override is http-only)', () => {
  assert.equal(isStrictLoopbackHttpOrigin('https://localhost:55555'), false);
  assert.equal(isStrictLoopbackHttpOrigin('https://127.0.0.1:1'), false);
});

test('isStrictLoopbackHttpOrigin rejects non-loopback', () => {
  assert.equal(isStrictLoopbackHttpOrigin('http://example.com:1'), false);
});
