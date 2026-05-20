/**
 * Super-System intelligence — error classification (no secrets in output).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  classifyErrorSignal,
  classifyInvariant,
  buildIntelligencePayload,
  ERROR_CATEGORIES,
  runZwDoctorIntelligence,
  summarizeByCategory,
} from '../tools/zwDoctor/superSystemIntelligence.mjs';
import { MODES } from '../tools/zwDoctor/run.mjs';
import { invariant } from '../tools/zwDoctor/types.mjs';

const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('zw-doctor CLI wiring', () => {
  it('MODES includes intelligence', () => {
    assert.ok(MODES.includes('intelligence'));
  });

  it('run.mjs re-exports runZwDoctorIntelligence', () => {
    assert.equal(typeof runZwDoctorIntelligence, 'function');
  });

  it('zw-doctor intelligence --ci-static exits without ReferenceError', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/zw-doctor.mjs', 'intelligence', '--ci-static'],
      {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          ZW_STAGING_CREDENTIAL_ROTATION: 'true',
        },
        encoding: 'utf8',
        timeout: 60_000,
      },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.notEqual(r.status, null);
    assert.ok(
      !/ReferenceError.*runZwDoctorIntelligence/.test(out),
      'missing intelligence runner import',
    );
    assert.match(out, /ZW_INTELLIGENCE_VERDICT/);
    assert.match(out, /MONEY_MUTATION_EXECUTED false/);
    assert.match(out, /SELF_HEALING_APPLY_ALLOWED false/);
  });
});

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
