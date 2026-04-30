/**
 * Web top-up compliance — sanctioned ISO + barred dial CC before Stripe.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HttpError } from '../src/lib/httpError.js';
import { assertWebTopupMoneyPathComplianceOrThrow } from '../src/lib/topupComplianceAssert.js';
import {
  digitsIndicateBlockedComplianceDialPrefix,
  restrictedSanctionedAlpha2Probe,
} from '../src/policy/restrictedRegions.js';

describe('topupComplianceAssert', () => {
  it('allows United States → Afghanistan (+93)', () => {
    assert.doesNotThrow(() =>
      assertWebTopupMoneyPathComplianceOrThrow({
        originCountry: 'US',
        destinationCountry: 'AF',
        phoneNumber: '93701234567',
      }),
    );
  });

  it('blocks sanctioned origin alpha-2', () => {
    assert.throws(
      () =>
        assertWebTopupMoneyPathComplianceOrThrow({
          originCountry: restrictedSanctionedAlpha2Probe(),
          destinationCountry: 'AF',
          phoneNumber: '93701234567',
        }),
      (e) =>
        e instanceof HttpError &&
        e.status === 403 &&
        e.code === 'restricted_region',
    );
  });

  it('blocks sanctioned destination alpha-2', () => {
    assert.throws(
      () =>
        assertWebTopupMoneyPathComplianceOrThrow({
          originCountry: 'US',
          destinationCountry: restrictedSanctionedAlpha2Probe(),
          phoneNumber: '93701234567',
        }),
      (e) =>
        e instanceof HttpError &&
        e.status === 403 &&
        e.code === 'restricted_region',
    );
  });

  it('blocks digit composition indicating barred CC prefix', () => {
    assert.equal(digitsIndicateBlockedComplianceDialPrefix('989123456789'), true);
    assert.throws(
      () =>
        assertWebTopupMoneyPathComplianceOrThrow({
          originCountry: 'US',
          destinationCountry: 'AF',
          phoneNumber: '989123456789',
        }),
      (e) =>
        e instanceof HttpError &&
        e.status === 403 &&
        e.code === 'restricted_region',
    );
  });
});
