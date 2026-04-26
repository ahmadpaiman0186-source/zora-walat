import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { jwtSecretLooksTrivial } from '../src/lib/jwtSecretQuality.js';

describe('jwtSecretLooksTrivial', () => {
  it('flags short secrets', () => {
    assert.equal(jwtSecretLooksTrivial('a'.repeat(31)), true);
  });

  it('flags single-character repetition', () => {
    assert.equal(jwtSecretLooksTrivial('z'.repeat(40)), true);
  });

  it('flags placeholder substrings', () => {
    assert.equal(jwtSecretLooksTrivial(`${'a'.repeat(20)}changeme${'b'.repeat(20)}`), true);
  });

  it('passes on mixed high-entropy-looking secret', () => {
    assert.equal(
      jwtSecretLooksTrivial(
        '7f3a9c2e1b8d4f6a0e5c7b9d2f4a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2',
      ),
      false,
    );
  });
});
