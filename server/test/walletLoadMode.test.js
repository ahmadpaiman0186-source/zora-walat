import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertApplyModeKeys,
  assertReplayModeKeys,
  parseLoadMode,
} from '../scripts/lib/wallet-load-mode.mjs';

describe('parseLoadMode', () => {
  it('parses --mode=apply', () => {
    const r = parseLoadMode(['node', 'x', '--mode=apply']);
    assert.equal(r.mode, 'apply');
    assert.ok(String(r.source).includes('argv'));
  });

  it('parses --mode apply (spaced)', () => {
    const r = parseLoadMode(['node', 'x', '--mode', 'replay']);
    assert.equal(r.mode, 'replay');
    assert.equal(r.source, 'argv(--mode_spaced)');
  });

  it('uses npm_lifecycle_event when argv omits mode', () => {
    const r = parseLoadMode(['node', 'x'], { npm_lifecycle_event: 'load:wallet:apply' });
    assert.equal(r.mode, 'apply');
    assert.equal(r.source, 'npm_lifecycle_event');
  });

  it('argv --mode= wins over npm_lifecycle_event', () => {
    const r = parseLoadMode(['node', 'x', '--mode=replay'], {
      npm_lifecycle_event: 'load:wallet:apply',
    });
    assert.equal(r.mode, 'replay');
  });
});

describe('assertApplyModeKeys', () => {
  it('rejects duplicates', () => {
    const r = assertApplyModeKeys(['a', 'a', 'b'], 3);
    assert.equal(r.ok, false);
    assert.ok(String(r.reason).includes('duplicate'));
  });

  it('accepts all unique', () => {
    const r = assertApplyModeKeys(['a', 'b', 'c'], 3);
    assert.equal(r.ok, true);
  });
});

describe('assertReplayModeKeys', () => {
  it('rejects mixed keys', () => {
    const r = assertReplayModeKeys(['x', 'x', 'y'], 'x', 3);
    assert.equal(r.ok, false);
  });

  it('accepts all shared', () => {
    const r = assertReplayModeKeys(['z', 'z', 'z'], 'z', 3);
    assert.equal(r.ok, true);
  });
});

