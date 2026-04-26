import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApp } from '../app.js';

describe('server root app.js shim', () => {
  it('re-exports createApp from src/app.js', () => {
    assert.equal(typeof createApp, 'function');
  });
});
