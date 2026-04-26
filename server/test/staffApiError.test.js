import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { API_CONTRACT_CODE, ORDER_API_ERROR_CODE } from '../src/constants/apiContractCodes.js';
import {
  inferStaffApiErrorCode,
  processingManualErrorCode,
  processingManualFailureBody,
  staffApiErrorBody,
} from '../src/lib/staffApiError.js';

describe('staffApiError', () => {
  it('inferStaffApiErrorCode maps common admin messages', () => {
    assert.equal(inferStaffApiErrorCode('Not found', 404), API_CONTRACT_CODE.NOT_FOUND);
    assert.equal(
      inferStaffApiErrorCode('Invalid order id', 400),
      ORDER_API_ERROR_CODE.INVALID_ORDER_ID,
    );
    assert.equal(
      inferStaffApiErrorCode('Invalid value "x". Allowed: a', 400),
      API_CONTRACT_CODE.VALIDATION_ERROR,
    );
    assert.equal(inferStaffApiErrorCode('Internal error', 500), API_CONTRACT_CODE.INTERNAL_ERROR);
  });

  it('staffApiErrorBody includes legacy error alias', () => {
    const b = staffApiErrorBody('Not found', 404);
    assert.equal(b.success, false);
    assert.equal(b.code, API_CONTRACT_CODE.NOT_FOUND);
    assert.equal(b.error, b.message);
  });

  it('processingManualFailureBody prefixes machine codes and keeps guidance', () => {
    const b = processingManualFailureBody({
      ok: false,
      status: 409,
      error: 'not_manual_required',
      guidance: 'Refresh the order view.',
    });
    assert.equal(b.success, false);
    assert.equal(b.code, 'processing_manual_not_manual_required');
    assert.equal(b.guidance, 'Refresh the order view.');
    assert.equal(typeof b.message, 'string');
  });

  it('processingManualErrorCode maps Order not found', () => {
    assert.equal(processingManualErrorCode('Order not found'), API_CONTRACT_CODE.NOT_FOUND);
  });
});
