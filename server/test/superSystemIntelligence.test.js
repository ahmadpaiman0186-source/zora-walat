/**
 * Super-System intelligence — error classification (no secrets in output).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyErrorSignal,
  classifyInvariant,
  buildIntelligencePayload,
  ERROR_CATEGORIES,
  summarizeByCategory,
} from '../tools/zwDoctor/superSystemIntelligence.mjs';
import { invariant } from '../tools/zwDoctor/types.mjs';

describe('classifyErrorSignal', () => {
  it('classifies auth from http 401', () => {
    assert.equal(classifyErrorSignal({ httpStatus: 401 }), 'auth');
  });

  it('classifies stripe from code', () => {
    assert.equal(
      classifyErrorSignal({ code: 'stripe_webhook_duplicate' }),
      'stripe',
    );
  });

  it('classifies deploy_root from message', () => {
    assert.equal(
      classifyErrorSignal({ message: 'vercel nextjs 404 html surface' }),
      'deploy_root',
    );
  });

  it('does not require secret literals in patterns', () => {
    const out = classifyErrorSignal({ message: 'configuration invalid' });
    assert.ok(ERROR_CATEGORIES.includes(out));
  });
});

describe('classifyInvariant', () => {
  it('maps paid-before-fulfillment to fulfillment', () => {
    const inv = invariant({
      id: 'PAID_BEFORE_FULFILLMENT',
      status: 'PASS',
      confidence: 'high',
      evidence: 'gate_ok',
      risk: 'none',
      proposed_next_action: 'ok',
      approval_required: false,
    });
    assert.equal(classifyInvariant(inv), 'fulfillment');
  });
});

describe('buildIntelligencePayload', () => {
  it('marks CRITICAL when invariant critical', () => {
    const payload = buildIntelligencePayload([
      invariant({
        id: 'SECRETS_SCAN_CLEAN',
        status: 'CRITICAL',
        confidence: 'high',
        evidence: 'scan_fail',
        risk: 'secret',
        proposed_next_action: 'fix',
        approval_required: true,
      }),
    ]);
    assert.equal(payload.platform_verdict, 'CRITICAL');
    assert.equal(payload.auto_repair_executed, false);
    assert.equal(payload.money_mutation_executed, false);
    assert.equal(payload.self_healing_apply_allowed, false);
  });

  it('summarizeByCategory counts statuses', () => {
    const summary = summarizeByCategory([
      invariant({
        id: 'DEPLOY_ROOT_IS_SERVER_API',
        status: 'PASS',
        confidence: 'high',
        evidence: 'ok',
        risk: 'low',
        proposed_next_action: 'ok',
        approval_required: false,
      }),
      invariant({
        id: 'STAGING_API_HEALTH',
        status: 'WARN',
        confidence: 'medium',
        evidence: 'timeout',
        risk: 'ops',
        proposed_next_action: 'check',
        approval_required: false,
      }),
    ]);
    assert.equal(summary.deploy_root.pass, 1);
    assert.equal(summary.db.warn, 1);
  });
});
