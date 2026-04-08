import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyReloadlyReportRowStatus } from '../src/services/reloadlyTransactionInquiry.js';

describe('classifyReloadlyReportRowStatus', () => {
  it('maps SUCCESSFUL to confirmed', () => {
    assert.equal(classifyReloadlyReportRowStatus('SUCCESSFUL'), 'confirmed');
  });
  it('maps FAILED to terminal_failure', () => {
    assert.equal(classifyReloadlyReportRowStatus('FAILED'), 'terminal_failure');
  });
  it('maps PENDING to pending', () => {
    assert.equal(classifyReloadlyReportRowStatus('PENDING'), 'pending');
  });
});
