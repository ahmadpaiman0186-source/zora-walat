/**
 * Production / runtime guard for Stripe test client override (money-path safety).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import {
  clearStripeClientOverrideForTests,
  setStripeClientOverrideForTests,
} from '../src/services/stripe.js';

describe('Stripe client test override guard', () => {
  let savedNodeEnv;
  let savedNpmLifecycle;

  before(() => {
    savedNodeEnv = process.env.NODE_ENV;
    savedNpmLifecycle = process.env.npm_lifecycle_event;
  });

  after(() => {
    process.env.NODE_ENV = savedNodeEnv;
    process.env.npm_lifecycle_event = savedNpmLifecycle;
    clearStripeClientOverrideForTests();
  });

  it('setStripeClientOverrideForTests throws when NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.npm_lifecycle_event;
    assert.throws(
      () => setStripeClientOverrideForTests({ charges: { retrieve: async () => ({}) } }),
      /NODE_ENV=production/,
    );
  });
});
