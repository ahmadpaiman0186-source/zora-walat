/**
 * L8 self-healing money-path — pure helpers + observability shape (no DB required).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluatePricingSnapshotDrift,
  traceIdFromCheckoutMetadata,
} from '../src/selfHealing/moneyPathDriftScan.js';
import { stripeCheckoutSessionToPlain } from '../src/selfHealing/moneyPathDriftRepair.js';
import { emitSelfHealingSpan } from '../src/selfHealing/l8SelfHealingObservability.js';

describe('L8 moneyPathDriftScan helpers', () => {
  it('traceIdFromCheckoutMetadata reads zwTraceId', () => {
    assert.equal(
      traceIdFromCheckoutMetadata({ zwTraceId: ' abc ' }),
      ' abc '.trim().slice(0, 128),
    );
    assert.equal(traceIdFromCheckoutMetadata(null), null);
  });

  it('evaluatePricingSnapshotDrift flags finalPrice vs line sum', () => {
    const r = evaluatePricingSnapshotDrift(
      {
        customerProductValueUsdCents: 100,
        customerGovernmentTaxUsdCents: 0,
        customerZoraServiceFeeUsdCents: 26,
        finalPriceUsdCents: 999,
      },
      126,
    );
    assert.ok(r?.mismatch);
    assert.match(String(r?.detail), /finalPrice/i);
  });

  it('evaluatePricingSnapshotDrift ok when consistent', () => {
    const r = evaluatePricingSnapshotDrift(
      {
        customerProductValueUsdCents: 100,
        customerGovernmentTaxUsdCents: 0,
        customerZoraServiceFeeUsdCents: 26,
        finalPriceUsdCents: 126,
      },
      126,
    );
    assert.equal(r?.mismatch, false);
  });
});

describe('stripeCheckoutSessionToPlain', () => {
  it('copies safe scalar fields + metadata', () => {
    const p = stripeCheckoutSessionToPlain({
      id: 'cs_test_123',
      metadata: { internalCheckoutId: 'cmabc', zwTraceId: 't1' },
      amount_total: 500,
      currency: 'usd',
      mode: 'payment',
      payment_status: 'paid',
    });
    assert.equal(p.id, 'cs_test_123');
    assert.equal(p.payment_status, 'paid');
    assert.equal(
      /** @type {{ internalCheckoutId?: string }} */ (p.metadata).internalCheckoutId,
      'cmabc',
    );
  });
});

describe('emitSelfHealingSpan', () => {
  it('emits JSON with l7 flag + suffix-only checkout ref', () => {
    /** @type {string[]} */
    const lines = [];
    const orig = console.log;
    console.log = (msg) => {
      lines.push(String(msg));
    };
    try {
      emitSelfHealingSpan('self_healing_detected', {
        traceId: 'trace-x',
        type: 'pricing_drift',
        subtype: 'x',
        checkoutId: 'ab' + 'cdefghijklmn',
        action: 'scan',
        result: 'detected',
      });
    } finally {
      console.log = orig;
    }
    assert.equal(lines.length, 1);
    const row = JSON.parse(lines[0]);
    assert.equal(row.l7, true);
    assert.equal(row.surface, 'security');
    assert.equal(row.stage, 'self_healing_detected');
    assert.equal(row.refs.checkoutIdSuffix, 'cdefghijklmn');
    assert.equal(row.refs.selfHealingEvent, 'self_healing_detected');
  });
});
