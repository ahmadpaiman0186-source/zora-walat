/**
 * Staging operator CLI safety — concatenation detection and argv parsing.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detectCommandConcatenation,
  normalizeOperatorModeAlias,
  parseOperatorCliArgv,
  safeOperatorCommandLine,
} from '../tools/stagingOperatorCliSafety.mjs';

const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('detectCommandConcatenation', () => {
  it('returns null for valid modes', () => {
    assert.equal(detectCommandConcatenation('login'), null);
    assert.equal(detectCommandConcatenation('l11-preflight'), null);
    assert.equal(detectCommandConcatenation('phase1-truth-check'), null);
  });

  it('detects loginnode and phase1-truth-checknode', () => {
    const a = detectCommandConcatenation('loginnode');
    assert.ok(a);
    assert.equal(a.baseMode, 'login');
    assert.match(a.glued, /node/i);

    const b = detectCommandConcatenation('phase1-truth-checknode');
    assert.ok(b);
    assert.equal(b.baseMode, 'phase1-truth-check');
  });

  it('detects phase1-truth-checkSet-Content glue', () => {
    const c = detectCommandConcatenation('phase1-truth-checkSet-Content');
    assert.ok(c);
    assert.equal(c.baseMode, 'phase1-truth-check');
    assert.match(c.glued, /set-content/i);
  });
});

describe('parseOperatorCliArgv', () => {
  it('rejects concatenated argv with command_concatenation_detected', () => {
    const parsed = parseOperatorCliArgv(['node', 'script', 'loginnode']);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, 'command_concatenation_detected');
      assert.equal(parsed.baseMode, 'login');
      assert.ok(parsed.nextSafeCommand.includes('login'));
    }
  });

  it('accepts l11-preflight', () => {
    const parsed = parseOperatorCliArgv(['node', 'script', 'l11-preflight']);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.mode, 'l11-preflight');
  });

  it('normalizes accidental 111-stripe-diagnose to l11-stripe-diagnose', () => {
    const alias = normalizeOperatorModeAlias('111-stripe-diagnose');
    assert.equal(alias.mode, 'l11-stripe-diagnose');
    assert.equal(alias.aliasFrom, '111-stripe-diagnose');
    const parsed = parseOperatorCliArgv(['node', 'script', '111-stripe-diagnose']);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.mode, 'l11-stripe-diagnose');
      assert.equal(parsed.aliasFrom, '111-stripe-diagnose');
    }
  });

  it('accepts staging-api-smoke', () => {
    const parsed = parseOperatorCliArgv(['node', 'script', 'staging-api-smoke']);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.mode, 'staging-api-smoke');
  });

  it('accepts l11-key-diagnose', () => {
    const parsed = parseOperatorCliArgv(['node', 'script', 'l11-key-diagnose']);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.mode, 'l11-key-diagnose');
  });
});

describe('staging-auth-checkout-operator CLI (spawn)', () => {
  it('loginnode exits 1 with command_concatenation_detected (not Usage-only)', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/staging-auth-checkout-operator.mjs', 'loginnode'],
      { cwd: SERVER_ROOT, encoding: 'utf8', timeout: 10_000 },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.equal(r.status, 1);
    assert.match(out, /LOCAL_VALIDATION_ERROR command_concatenation_detected/);
    assert.match(out, /NEXT_SAFE_COMMAND/);
    assert.ok(!out.includes('eyJ'));
  });

  it('phase1-truth-checkSet-Content exits 1 with concatenation error', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/staging-auth-checkout-operator.mjs', 'phase1-truth-checkSet-Content'],
      { cwd: SERVER_ROOT, encoding: 'utf8', timeout: 10_000 },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.equal(r.status, 1);
    assert.match(out, /command_concatenation_detected/);
    assert.match(out, /phase1-truth-check/);
  });

  it('l11-refund-execute refuses without L11_REFUND_APPROVAL env', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/staging-auth-checkout-operator.mjs', 'l11-refund-execute'],
      {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          L11_REFUND_APPROVAL: '',
          STAGING_OPERATOR_EMAIL: '',
          STAGING_OPERATOR_PASSWORD: '',
        },
        encoding: 'utf8',
        timeout: 30_000,
      },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.match(out, /FINAL_REFUND_GUARD_PASS false/);
    assert.match(out, /refund_approval_missing|L11_REFUND_APPROVAL_EXACT false/);
    assert.ok(!/REFUND_CREATED true/.test(out));
  });

  it('l11-preflight prints DO_NOT_REFUND without network when blocked locally', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/staging-auth-checkout-operator.mjs', 'l11-preflight'],
      {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          STAGING_OPERATOR_EMAIL: '',
          STAGING_OPERATOR_PASSWORD: '',
        },
        encoding: 'utf8',
        timeout: 120_000,
      },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.match(out, /MODE l11-preflight/);
    assert.match(out, /DO_NOT_REFUND true/);
    assert.match(out, /L11_PREFLIGHT_VERDICT BLOCKED|BLOCKED_REASON/);
    assert.ok(!/refunds\.create/i.test(out));
    assert.ok(!/STRIPE_REFUND_EXECUTED/i.test(out));
  });
});

describe('safeOperatorCommandLine', () => {
  it('returns single-token-safe command', () => {
    const line = safeOperatorCommandLine('l11-preflight');
    assert.match(line, /staging-auth-checkout-operator\.mjs l11-preflight$/);
  });
});
