import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateReloadlyDistributedCircuitWindow,
  deriveReloadlyTopupOutcomeKind,
} from '../src/services/reloadlyDistributedCircuit.js';

describe('evaluateReloadlyDistributedCircuitWindow', () => {
  const now = 1_700_000_000_000;
  const opts = {
    windowMs: 60_000,
    minSamples: 10,
    failureRatio: 0.15,
    rateLimitSoftMin: 4,
  };

  it('opens soft rate-limit regime before hard open on 429-only samples', () => {
    /** @type {{ t: number, kind: string, success: boolean }[]} */
    const ev = [];
    for (let i = 0; i < 8; i++) {
      ev.push({ t: now - i * 1000, kind: 'rate_limit', success: false });
    }
    const r = evaluateReloadlyDistributedCircuitWindow(ev, now, opts);
    assert.equal(r.softRateLimit, true);
    assert.equal(r.hardOpen, false);
  });

  it('hard-opens on transient-heavy eligible window', () => {
    /** @type {{ t: number, kind: string, success: boolean }[]} */
    const ev = [];
    for (let i = 0; i < 12; i++) {
      const ok = i % 4 !== 0;
      ev.push({
        t: now - i * 500,
        kind: ok ? 'ok' : 'transient',
        success: ok,
      });
    }
    const r = evaluateReloadlyDistributedCircuitWindow(ev, now, opts);
    assert.equal(r.hardOpen, true);
  });

  it('ignores auth samples in eligible denominator', () => {
    /** @type {{ t: number, kind: string, success: boolean }[]} */
    const ev = [];
    for (let i = 0; i < 20; i++) {
      ev.push({ t: now - i * 100, kind: 'auth', success: false });
    }
    const r = evaluateReloadlyDistributedCircuitWindow(ev, now, opts);
    assert.equal(r.eligible, 0);
    assert.equal(r.hardOpen, false);
  });
});

describe('deriveReloadlyTopupOutcomeKind', () => {
  it('classifies auth phase', () => {
    const k = deriveReloadlyTopupOutcomeKind({
      resultType: 'failed',
      raw: { phase: 'auth', failureCode: 'x' },
    });
    assert.equal(k.kind, 'auth');
  });

  it('classifies 429', () => {
    const k = deriveReloadlyTopupOutcomeKind({
      resultType: 'failed',
      raw: { kind: 'failed', failureCode: 'reloadly_topup_rate_limited' },
    });
    assert.equal(k.kind, 'rate_limit');
  });
});
