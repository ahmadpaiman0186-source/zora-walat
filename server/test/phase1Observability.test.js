import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import {
  sanitizePhase1ObservabilityFields,
  sanitizePhase1ObservabilityValue,
} from '../src/infrastructure/logging/phase1ObservabilitySanitize.js';
import {
  PHASE1_OBSERVABILITY_EVENT,
  emitPhase1ObservabilityEvent,
  emitPhase1RetryObservation,
  finalizePhase1ReconciliationObservation,
  buildPhase1SafeRefs,
} from '../src/infrastructure/logging/phase1Observability.js';
import {
  PHASE1_CRITICAL_ALERT_TYPE,
  registerPhase1CriticalAlertHook,
  resetPhase1CriticalAlertHooksForTests,
} from '../src/infrastructure/logging/phase1CriticalAlertHooks.js';
import {
  evaluatePhase1OperationalRetrySchedule,
  OPERATIONAL_RETRY_DENIAL,
} from '../src/domain/fulfillment/phase1OperationalRetry.js';

describe('phase1Observability', () => {
  /** @type {string[]} */
  let logLines;
  /** @type {typeof console.log} */
  let origLog;

  beforeEach(() => {
    logLines = [];
    origLog = console.log;
    console.log = (msg) => {
      logLines.push(typeof msg === 'string' ? msg : JSON.stringify(msg));
    };
    resetPhase1CriticalAlertHooksForTests();
  });

  afterEach(() => {
    console.log = origLog;
    resetPhase1CriticalAlertHooksForTests();
  });

  it('scrubs secret-like strings', () => {
    const fakeStripeKey =
      'sk_' + 'live_' + 'redaction_test_not_a_real_key';
    const o = sanitizePhase1ObservabilityFields({
      note: `prefix ${fakeStripeKey}`,
    });
    assert.equal(o.note, '[redacted_secret_pattern]');
  });

  it('redacts phone-like keys', () => {
    const o = sanitizePhase1ObservabilityFields({
      recipientNational: '93701234567',
    });
    assert.equal(o.recipientNational, '***4567');
  });

  it('emit adds schemaVersion and phase1Observability flag', () => {
    emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.PAYMENT_SUCCEEDED, {
      status: ORDER_STATUS.PAID,
    });
    const line = JSON.parse(logLines[0]);
    assert.equal(line.phase1Observability, true);
    assert.equal(line.schemaVersion, 1);
    assert.equal(line.event, PHASE1_OBSERVABILITY_EVENT.PAYMENT_SUCCEEDED);
  });

  it('safe refs never embed raw full ids in emitted suffix fields', () => {
    const refs = buildPhase1SafeRefs({
      id: 'cmabcdefghijklmnopqr',
      stripePaymentIntentId: 'pi_1234567890abcdefghij',
    });
    emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.FULFILLMENT_QUEUED, {
      ...refs,
      provider: 'mock',
    });
    const line = JSON.parse(logLines[0]);
    assert.ok(!JSON.stringify(line).includes('cmabcdefghijklmnopqr'));
    assert.ok(!JSON.stringify(line).includes('pi_1234567890abcdefghij'));
    assert.ok(line.orderIdSuffix != null);
  });

  it('retry observation emits retryDecision with denial', () => {
    const ev = evaluatePhase1OperationalRetrySchedule(
      { orderStatus: ORDER_STATUS.PENDING, postPaymentIncidentStatus: 'NONE' },
      [],
      { lastFailureTransientEligible: true },
    );
    emitPhase1RetryObservation(ev, buildPhase1SafeRefs({ id: 'ord_x', stripePaymentIntentId: 'pi_y' }));
    const line = JSON.parse(logLines[0]);
    assert.equal(line.event, PHASE1_OBSERVABILITY_EVENT.RETRY_DENIED);
    assert.equal(line.retryDecision.denial, OPERATIONAL_RETRY_DENIAL.NOT_PAID);
  });

  it('reconciliation drift triggers observability + critical alert hook', () => {
    /** @type {string[]} */
    const alerts = [];
    registerPhase1CriticalAlertHook((type, payload) => {
      alerts.push(type);
      assert.ok(payload.driftCodes);
    });
    finalizePhase1ReconciliationObservation(
      {
        aligned: false,
        driftCodes: ['order_paid_payment_row_not_succeeded'],
        compoundOk: false,
      },
      buildPhase1SafeRefs({ id: 'cm_test_order_ref', stripePaymentIntentId: 'pi_testabc' }),
    );
    assert.equal(logLines.length, 2);
    const obs = JSON.parse(logLines[0]);
    const crit = JSON.parse(logLines[1]);
    assert.equal(obs.event, PHASE1_OBSERVABILITY_EVENT.RECONCILIATION_DRIFT_DETECTED);
    assert.equal(crit.phase1CriticalAlert, true);
    assert.equal(crit.alertType, PHASE1_CRITICAL_ALERT_TYPE.RECONCILIATION_DRIFT_DETECTED);
    assert.equal(alerts.length, 1);
  });

  it('sanitizePhase1ObservabilityValue drops nested secret keys', () => {
    const v = sanitizePhase1ObservabilityValue({
      stripeSecretKey: 'should_drop',
      ok: 'yes',
    });
    assert.equal(v.ok, 'yes');
    assert.equal(v.stripeSecretKey, undefined);
  });
});
