/**
 * JWT shape for access tokens (requires env JWT secrets from bootstrap).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { env } from '../src/config/env.js';
import { signAccessToken, verifyAccessToken } from '../src/services/authTokenService.js';

const run =
  typeof env.jwtAccessSecret === 'string' &&
  env.jwtAccessSecret.length >= 32;

describe('authTokenService access JWT', { skip: !run }, () => {
  it('includes ev (email verified hint) matching user.emailVerifiedAt', () => {
    const verified = {
      id: 'u1',
      email: 'a@test.invalid',
      role: 'user',
      tokenVersion: 0,
      emailVerifiedAt: new Date(),
    };
    const unverified = {
      id: 'u2',
      email: 'b@test.invalid',
      role: 'user',
      tokenVersion: 0,
      emailVerifiedAt: null,
    };
    const t1 = signAccessToken(verified);
    const t2 = signAccessToken(unverified);
    const p1 = verifyAccessToken(t1);
    const p2 = verifyAccessToken(t2);
    assert.equal(p1.ev, 1);
    assert.equal(p2.ev, 0);
  });
});
