/**
 * zw-doctor report sanitizer tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertSanitizedReportSafe,
  sanitizeObject,
  sanitizeZwDoctorReport,
  stripeIdToSuffix,
} from '../tools/zwDoctor/sanitizeReport.mjs';
import { stripeLiveSkUnderscore } from '../tools/zwDoctor/secretPatterns.mjs';

describe('sanitizeReport', () => {
  it('stripeIdToSuffix keeps last 8 chars only', () => {
    assert.equal(stripeIdToSuffix('pi_abcdefghijklmnopqrstuvwxyz'), '…uvwxyz');
  });

  it('redacts sensitive object keys', () => {
    const out = sanitizeObject({
      ok: true,
      stripe_secret_key: 'should_hide',
      note: 'visible',
    });
    assert.equal(out.stripe_secret_key, '[REDACTED_SENSITIVE_FIELD]');
    assert.equal(out.note, 'visible');
  });

  it('sanitizeZwDoctorReport passes assertSanitizedReportSafe', () => {
    const report = {
      version: '1.0.0',
      mode: 'summary',
      timestamp: new Date().toISOString(),
      verdict: 'PASS',
      invariants: [
        {
          id: 'TEST',
          status: 'PASS',
          confidence: 'high',
          evidence: `order pi_${'a'.repeat(20)}suffix12`,
          risk: 'none',
          proposed_next_action: 'none',
          approval_required: false,
        },
      ],
      proposals: [],
      summary: { PASS: 1, total: 1 },
      safety: {
        refunds_executed: false,
        payments_created: false,
        webhooks_resent: false,
        production_data_mutated: false,
      },
    };
    const sanitized = sanitizeZwDoctorReport(report);
    assert.ok(String(sanitized.invariants[0].evidence).includes('…suffix12'));
    assertSanitizedReportSafe(sanitized);
  });

  it('rejects unsanitized stripe key material in blob', () => {
    const fake = `${stripeLiveSkUnderscore()}${'x'.repeat(24)}`;
    assert.throws(
      () => assertSanitizedReportSafe({ sample: fake }),
      /stripe_key_material/,
    );
  });
});
