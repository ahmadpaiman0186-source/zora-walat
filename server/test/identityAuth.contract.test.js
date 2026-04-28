import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';

describe('identity / auth contracts', () => {
  it('AUTH_ERROR_CODE values are unique', () => {
    const vals = Object.values(AUTH_ERROR_CODE);
    assert.equal(new Set(vals).size, vals.length);
  });
});
