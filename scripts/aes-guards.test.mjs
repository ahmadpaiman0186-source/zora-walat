/**
 * Deterministic AES guard tests (no network, no WMI).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyRepoOwnedNodeProcess,
  countPendingMigrationsFromStatusOutput,
  redactCommandLineForDisplay,
} from './aes-internal.mjs';

describe('classifyRepoOwnedNodeProcess', () => {
  const repo = 'C:\\Users\\me\\zora_walat';

  it('allows repo-owned Windows node.exe Next command', () => {
    const cmd =
      '"node.exe" "C:\\Users\\me\\zora_walat\\node_modules\\next\\dist\\bin\\next" dev';
    assert.equal(
      classifyRepoOwnedNodeProcess(repo, 'node.exe', cmd),
      'repo_node_safe',
    );
  });

  it('refuses wrong repo path', () => {
    assert.equal(
      classifyRepoOwnedNodeProcess(repo, 'node.exe', 'node C:\\\\other\\\\app\\\\index.js'),
      'not_repo_path',
    );
  });

  it('refuses non-node process name', () => {
    assert.equal(
      classifyRepoOwnedNodeProcess(repo, 'chrome.exe', 'chrome.exe ...'),
      'not_node',
    );
  });
});

describe('countPendingMigrationsFromStatusOutput', () => {
  it('counts timestamp-prefixed migration lines after marker', () => {
    const sample = `Following migrations have not yet been applied:\n20260503103000_canonical_transaction_engine\n20260404190000_referral_program\n`;
    assert.equal(countPendingMigrationsFromStatusOutput(sample), 2);
  });

  it('returns 0 when schema is current', () => {
    assert.equal(
      countPendingMigrationsFromStatusOutput('Database schema is up to date'),
      0,
    );
  });
});

describe('redactCommandLineForDisplay', () => {
  it('redacts Stripe secret patterns', () => {
    const out = redactCommandLineForDisplay(
      'node -e sk_test_abcdefghijklmnop && ok',
    );
    assert.ok(out.includes('[REDACTED]'));
    assert.ok(!out.includes('sk_test_abcdefghijklmnop'));
  });
});
