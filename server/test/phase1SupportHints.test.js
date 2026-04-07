import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import {
  financialAnomalySupportLines,
  buildSupportCorrelationChecklist,
} from '../src/lib/phase1SupportHints.js';

describe('phase1SupportHints', () => {
  it('maps known anomaly codes to stable support lines', () => {
    const lines = financialAnomalySupportLines([
      FINANCIAL_ANOMALY.LOW_MARGIN,
      FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING,
    ]);
    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes('LOW_MARGIN'));
    assert.ok(lines[1].includes('PROVIDER_REFERENCE_MISSING'));
  });

  it('builds correlation checklist without leaking full id semantics beyond API paths', () => {
    const c = buildSupportCorrelationChecklist({
      checkoutId: 'ck_test_order_id_value',
      stripePaymentIntentId: 'pi_test',
      stripeCheckoutSessionId: 'cs_test',
      completedByStripeWebhookEventId: 'evt_test',
    });
    assert.ok(c.apiOwnerPhase1Truth.includes('ck_test_order_id_value'));
    assert.equal(c.stripeObjects.paymentIntentId, 'pi_test');
    assert.equal(c.orderIdSuffixForTickets, 'der_id_value');
  });
});
