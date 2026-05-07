import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  devCheckoutBypassExpectedUserId,
  devCheckoutBypassSecretForCompare,
  isDevCheckoutAuthBypassRuntimeConfigured,
} from '../src/lib/devCheckoutAuthBypassRuntime.js';

let saved = {};

beforeEach(() => {
  saved = {
    NODE_ENV: process.env.NODE_ENV,
    DEV_CHECKOUT_AUTH_BYPASS: process.env.DEV_CHECKOUT_AUTH_BYPASS,
    DEV_CHECKOUT_BYPASS_SECRET: process.env.DEV_CHECKOUT_BYPASS_SECRET,
    DEV_CHECKOUT_BYPASS_USER_ID: process.env.DEV_CHECKOUT_BYPASS_USER_ID,
  };
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function setGoodDevBypass() {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'usr_smoke_test_placeholder';
}

test('production never allows dev checkout auth bypass env gate', () => {
  process.env.NODE_ENV = 'production';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'u1';
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
});

test('test env never allows dev checkout auth bypass env gate', () => {
  process.env.NODE_ENV = 'test';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'u1';
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
});

test('development without DEV_CHECKOUT_AUTH_BYPASS=true: gate closed', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.DEV_CHECKOUT_AUTH_BYPASS;
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'u1';
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
});

test('development without secret: gate closed', () => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  delete process.env.DEV_CHECKOUT_BYPASS_SECRET;
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'u1';
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
});

test('development with secret shorter than 16: gate closed', () => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = 'short';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'u1';
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
});

test('development without user id: gate closed', () => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  delete process.env.DEV_CHECKOUT_BYPASS_USER_ID;
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
});

test('development with True (normalized) and full config: gate open', () => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'True\n';
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '01234567890123456';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'u1';
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), true);
});

test('secret and user id helpers trim', () => {
  setGoodDevBypass();
  process.env.DEV_CHECKOUT_BYPASS_SECRET = '  01234567890123456  ';
  process.env.DEV_CHECKOUT_BYPASS_USER_ID = '  uid-1  ';
  assert.equal(devCheckoutBypassSecretForCompare(), '01234567890123456');
  assert.equal(devCheckoutBypassExpectedUserId(), 'uid-1');
});
