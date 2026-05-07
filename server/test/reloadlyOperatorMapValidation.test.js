import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mergeReloadlyOperatorMaps,
  RELOADLY_OPERATOR_ID_DEFAULTS,
} from '../src/config/reloadlyOperatorIdDefaults.js';
import {
  RELOADLY_AF_PHASE1_OPERATOR_KEYS,
  parseReloadlyOperatorMapJsonStrict,
  validateAfghanistanReloadlyOperatorMapCoverage,
} from '../src/lib/reloadlyOperatorMapValidation.js';

describe('reloadlyOperatorMapValidation', () => {
  it('defaults cover all Afghanistan Phase-1 operator keys with numeric ids', () => {
    const cov = validateAfghanistanReloadlyOperatorMapCoverage({
      ...RELOADLY_OPERATOR_ID_DEFAULTS,
    });
    assert.equal(cov.ok, true);
    assert.equal(cov.missing.length, 0);
    assert.equal(cov.invalid.length, 0);
    assert.equal(RELOADLY_AF_PHASE1_OPERATOR_KEYS.length, 5);
  });

  it('parseReloadlyOperatorMapJsonStrict rejects non-object JSON', () => {
    assert.equal(parseReloadlyOperatorMapJsonStrict('').skipped, true);
    assert.equal(parseReloadlyOperatorMapJsonStrict('   ').skipped, true);
    assert.equal(parseReloadlyOperatorMapJsonStrict('{"mtn":"1"}').ok, true);
    assert.equal(parseReloadlyOperatorMapJsonStrict('[1]').ok, false);
    assert.equal(parseReloadlyOperatorMapJsonStrict('null').ok, false);
    assert.equal(parseReloadlyOperatorMapJsonStrict('{no').ok, false);
  });

  it('mergeReloadlyOperatorMaps overrides defaults per key', () => {
    const m = mergeReloadlyOperatorMaps(RELOADLY_OPERATOR_ID_DEFAULTS, { mtn: '999' });
    assert.equal(m.mtn, '999');
    assert.equal(m.roshan, RELOADLY_OPERATOR_ID_DEFAULTS.roshan);
  });

  it('validateAfghanistanReloadlyOperatorMapCoverage reports missing keys', () => {
    const cov = validateAfghanistanReloadlyOperatorMapCoverage({
      mtn: '1',
      roshan: '2',
      // afghanwireless, etisalat, salaam missing
    });
    assert.equal(cov.ok, false);
    assert.ok(cov.missing.includes('afghanwireless'));
  });
});
