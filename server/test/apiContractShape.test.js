import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { API_CONTRACT_CODE, FAILURE_SCENARIO } from '../src/constants/apiContractCodes.js';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { WEBTOPUP_CLIENT_ERROR_CODE } from '../src/constants/webtopupClientErrors.js';
import { clientErrorBody, clientSuccessBody } from '../src/lib/clientErrorJson.js';

function assertErrorShape(body) {
  assert.equal(body.success, false);
  assert.equal(typeof body.message, 'string');
  assert.equal(typeof body.code, 'string');
  assert.equal(body.error, body.message, 'legacy error must mirror message');
}

describe('clientErrorBody / clientSuccessBody', () => {
  it('normalizes error contract', () => {
    const b = clientErrorBody('x', 'c_code');
    assertErrorShape(b);
    assert.equal(b.message, 'x');
    assert.equal(b.code, 'c_code');
  });

  it('merges extra without breaking shape', () => {
    const b = clientErrorBody('m', 'c', { moneyPathOutcome: 'rejected' });
    assertErrorShape(b);
    assert.equal(b.moneyPathOutcome, 'rejected');
  });

  it('success helper sets success true', () => {
    const b = clientSuccessBody({ foo: 1 });
    assert.equal(b.success, true);
    assert.equal(b.foo, 1);
  });
});

describe('FAILURE_SCENARIO maps to real codes', () => {
  it('auth and risk scenarios exist in source constants', () => {
    assert.equal(FAILURE_SCENARIO.auth_required, AUTH_ERROR_CODE.AUTH_REQUIRED);
    assert.equal(
      FAILURE_SCENARIO.verification_required,
      AUTH_ERROR_CODE.AUTH_VERIFICATION_REQUIRED,
    );
    assert.equal(FAILURE_SCENARIO.otp_invalid, AUTH_ERROR_CODE.AUTH_OTP_INVALID);
    assert.equal(FAILURE_SCENARIO.risk_rate_limited, RISK_REASON_CODE.RATE_LIMITED);
    assert.equal(
      FAILURE_SCENARIO.payment_verification_failed,
      WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_PAYMENT_VERIFICATION_FAILED,
    );
  });

  it('API_CONTRACT_CODE has framework entries', () => {
    assert.equal(typeof API_CONTRACT_CODE.NOT_FOUND, 'string');
    assert.equal(typeof API_CONTRACT_CODE.INTERNAL_ERROR, 'string');
    assert.equal(API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE, 'unsupported_media_type');
  });
});
