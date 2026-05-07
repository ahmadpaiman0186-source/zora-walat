import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ZodError } from 'zod';

import { env } from '../src/config/env.js';
import {
  assertMoneyPathIdentityAllowed,
  buildIdentityTrustContext,
  classifyIdentityTrustLevel,
} from '../src/security/identityTrustContext.js';
import { checkoutSessionBodySchema } from '../src/validators/checkoutSession.js';

describe('classifyIdentityTrustLevel', () => {
  it('classifies local proof first', () => {
    assert.equal(
      classifyIdentityTrustLevel({
        hasUser: true,
        hasOptionalJwt: false,
        isLocalProof: true,
        isAdminOperator: true,
        anonymousSurface: false,
      }),
      'local_proof_user',
    );
  });

  it('classifies staff JWT as admin_operator', () => {
    assert.equal(
      classifyIdentityTrustLevel({
        hasUser: true,
        hasOptionalJwt: false,
        isLocalProof: false,
        isAdminOperator: true,
        anonymousSurface: false,
      }),
      'admin_operator',
    );
  });

  it('classifies normal user JWT as verified_user', () => {
    assert.equal(
      classifyIdentityTrustLevel({
        hasUser: true,
        hasOptionalJwt: false,
        isLocalProof: false,
        isAdminOperator: false,
        anonymousSurface: false,
      }),
      'verified_user',
    );
  });

  it('classifies optional JWT binding as verified_user', () => {
    assert.equal(
      classifyIdentityTrustLevel({
        hasUser: false,
        hasOptionalJwt: true,
        isLocalProof: false,
        isAdminOperator: false,
        anonymousSurface: false,
      }),
      'verified_user',
    );
  });

  it('classifies anonymous pricing surface', () => {
    assert.equal(
      classifyIdentityTrustLevel({
        hasUser: false,
        hasOptionalJwt: false,
        isLocalProof: false,
        isAdminOperator: false,
        anonymousSurface: true,
      }),
      'anonymous_checkout_allowed',
    );
  });

  it('classifies missing identity as untrusted', () => {
    assert.equal(
      classifyIdentityTrustLevel({
        hasUser: false,
        hasOptionalJwt: false,
        isLocalProof: false,
        isAdminOperator: false,
        anonymousSurface: false,
      }),
      'untrusted',
    );
  });
});

describe('buildIdentityTrustContext', () => {
  it('builds from req.user JWT path', () => {
    const req = {
      path: '/create-checkout-session',
      originalUrl: '/create-checkout-session',
      traceId: 'trace-1',
      identityAuthSource: 'jwt',
      user: {
        id: 'usr_1',
        email: 'a@b.com',
        role: 'user',
        emailVerified: true,
      },
    };
    const ctx = buildIdentityTrustContext(req);
    assert.equal(ctx.trustLevel, 'verified_user');
    assert.equal(ctx.userId, 'usr_1');
    assert.equal(ctx.email, 'a@b.com');
    assert.equal(ctx.emailVerified, true);
    assert.equal(ctx.isLocalProof, false);
    assert.equal(ctx.source, 'jwt');
    assert.equal(ctx.traceId, 'trace-1');
  });

  it('builds local_proof_user from dev_bypass source', () => {
    const req = {
      path: '/api/wallet/balance',
      originalUrl: '/api/wallet/balance',
      traceId: 't2',
      identityAuthSource: 'dev_bypass',
      user: {
        id: 'usr_dev',
        email: 'dev@local',
        role: 'user',
        emailVerified: false,
      },
    };
    const ctx = buildIdentityTrustContext(req);
    assert.equal(ctx.trustLevel, 'local_proof_user');
    assert.equal(ctx.isLocalProof, true);
    assert.equal(ctx.source, 'dev_bypass');
  });

  it('builds optional JWT decoration', () => {
    const req = {
      path: '/create-payment-intent',
      originalUrl: '/create-payment-intent',
      webtopupAuthUser: { id: 'usr_opt', emailVerified: true },
    };
    const ctx = buildIdentityTrustContext(req);
    assert.equal(ctx.trustLevel, 'verified_user');
    assert.equal(ctx.userId, 'usr_opt');
    assert.equal(ctx.source, 'jwt_optional');
  });
});

describe('assertMoneyPathIdentityAllowed', () => {
  const verified = { trustLevel: 'verified_user' };
  const untrusted = { trustLevel: 'untrusted' };
  const anon = { trustLevel: 'anonymous_checkout_allowed' };

  it('strict_authenticated allows verified_user', () => {
    const r = assertMoneyPathIdentityAllowed(verified, {
      mode: 'strict_authenticated',
    });
    assert.equal(r.ok, true);
  });

  it('strict_authenticated rejects untrusted', () => {
    const r = assertMoneyPathIdentityAllowed(untrusted, {
      mode: 'strict_authenticated',
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 401);
  });

  it('embedded_pi allows untrusted when not owner-only', () => {
    const prev = env.ownerAllowedEmail;
    env.ownerAllowedEmail = '';
    try {
      const r = assertMoneyPathIdentityAllowed(untrusted, { mode: 'embedded_pi' });
      assert.equal(r.ok, true);
    } finally {
      env.ownerAllowedEmail = prev;
    }
  });

  it('embedded_pi rejects untrusted when owner-only enforced', () => {
    const prev = env.ownerAllowedEmail;
    env.ownerAllowedEmail = 'owner@example.com';
    try {
      const r = assertMoneyPathIdentityAllowed(untrusted, { mode: 'embedded_pi' });
      assert.equal(r.ok, false);
      assert.equal(r.status, 403);
    } finally {
      env.ownerAllowedEmail = prev;
    }
  });

  it('embedded_pi allows anonymous_checkout_allowed', () => {
    const prev = env.ownerAllowedEmail;
    env.ownerAllowedEmail = '';
    try {
      const r = assertMoneyPathIdentityAllowed(anon, { mode: 'embedded_pi' });
      assert.equal(r.ok, true);
    } finally {
      env.ownerAllowedEmail = prev;
    }
  });

  it('attach_only always passes', () => {
    const r = assertMoneyPathIdentityAllowed(untrusted, { mode: 'attach_only' });
    assert.equal(r.ok, true);
  });
});

describe('checkout session body ignores client userId (strict schema)', () => {
  it('rejects unknown userId field at validation layer', () => {
    assert.throws(() => {
      checkoutSessionBodySchema.parse({
        currency: 'usd',
        senderCountry: 'US',
        amountUsdCents: 500,
        operatorKey: 'roshan',
        recipientPhone: '0701234567',
        userId: 'attacker-controlled-id',
      });
    }, (e) => e instanceof ZodError && e.issues.some((i) => i.code === 'unrecognized_keys'));
  });
});
