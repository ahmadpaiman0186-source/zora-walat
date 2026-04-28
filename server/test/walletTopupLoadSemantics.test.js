import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyModeDefects,
  classifyWalletTopupResult,
  replayModeDefects,
} from '../scripts/lib/wallet-load-semantics.mjs';

describe('classifyWalletTopupResult', () => {
  it('401 → auth_required', () => {
    const c = classifyWalletTopupResult(401, { error: 'Authentication required' });
    assert.equal(c.kind, 'auth_required');
  });

  it('400 idempotency required (message fallback if code omitted)', () => {
    assert.equal(
      classifyWalletTopupResult(400, {
        error: 'Idempotency-Key header required (UUID v4)',
      }).kind,
      'idempotency_required',
    );
  });

  it('400 idempotency codes', () => {
    assert.equal(
      classifyWalletTopupResult(400, {
        code: 'wallet_topup_idempotency_required',
      }).kind,
      'idempotency_required',
    );
    assert.equal(
      classifyWalletTopupResult(400, {
        code: 'wallet_topup_idempotency_invalid',
      }).kind,
      'idempotency_invalid',
    );
  });

  it('409 conflict', () => {
    assert.equal(
      classifyWalletTopupResult(409, {
        code: 'wallet_topup_idempotency_conflict',
      }).kind,
      'idempotency_conflict',
    );
  });

  it('403 email verification required', () => {
    assert.equal(
      classifyWalletTopupResult(403, {
        code: 'auth_verification_required',
        message: 'Email verification is required for this action.',
      }).kind,
      'verification_required',
    );
  });

  it('400 amount policy', () => {
    assert.equal(
      classifyWalletTopupResult(400, {
        code: 'wallet_topup_amount_out_of_range',
      }).kind,
      'amount_out_of_range',
    );
  });

  it('429 wallet top-up limiter', () => {
    assert.equal(
      classifyWalletTopupResult(429, {
        code: 'wallet_topup_rate_limited',
        error: 'Too many wallet top-up requests; try again later.',
      }).kind,
      'wallet_topup_rate_limited',
    );
  });

  it('429 wallet top-up per-minute limiter', () => {
    assert.equal(
      classifyWalletTopupResult(429, {
        code: 'wallet_topup_per_minute_limited',
        error: 'Too many wallet top-ups per minute; try again shortly.',
      }).kind,
      'wallet_topup_per_minute_limited',
    );
  });

  it('200 apply vs replay', () => {
    assert.equal(
      classifyWalletTopupResult(200, {
        ok: true,
        idempotentReplay: false,
      }).kind,
      'apply_ok',
    );
    assert.equal(
      classifyWalletTopupResult(200, {
        ok: true,
        idempotentReplay: true,
      }).kind,
      'replay_ok',
    );
  });
});

describe('replayModeDefects', () => {
  it('flags missing replay when multiple requests', () => {
    const d = replayModeDefects([
      { kind: 'apply_ok' },
      { kind: 'apply_ok' },
    ]);
    assert.ok(d.some((x) => x.includes('multiple_apply')));
  });
});

describe('applyModeDefects', () => {
  it('flags mixed kinds', () => {
    const d = applyModeDefects([{ kind: 'apply_ok' }, { kind: 'replay_ok' }]);
    assert.ok(d.length > 0);
  });
});
