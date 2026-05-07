/**
 * Reloadly payload shape + outbound gates (no provider HTTP, no secrets).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { assertPhase1FulfillmentQueuePreconditions } from '../src/domain/orders/phase1TransactionStateMachine.js';
import { shouldBlockPhase1ReloadlyOutbound } from '../src/domain/fulfillment/fulfillmentOutboundPolicy.js';
import { buildReloadlyTopupPayload } from '../src/domain/fulfillment/reloadlyTopup.js';
import { resolveReloadlyOperatorId } from '../src/domain/fulfillment/reloadlyOperatorMapping.js';
import { RELOADLY_OPERATOR_ID_DEFAULTS } from '../src/config/reloadlyOperatorIdDefaults.js';
import { validateAfghanistanReloadlyOperatorMapCoverage } from '../src/lib/reloadlyOperatorMapValidation.js';

describe('Reloadly dry-run payload + gates (no HTTP)', () => {
  it('buildReloadlyTopupPayload maps AF phone 93{national} and USD amount', () => {
    const map = { mtn: '535' };
    const r = buildReloadlyTopupPayload(
      {
        id: 'ord_test_123456789012',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        amountUsdCents: 1000,
        currency: 'usd',
        pricingSnapshot: null,
      },
      map,
      { customIdentifier: 'zwr_test', providerRequestKey: 'zwr_test' },
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.body.recipientPhone.countryCode, 'AF');
    assert.equal(r.body.recipientPhone.number, '93701234567');
    assert.equal(r.body.amount, '10.00');
    assert.equal(String(r.body.operatorId), '535');
  });

  it('buildReloadlyTopupPayload prefers pricingSnapshot customerProductValueUsdCents', () => {
    const map = { mtn: '535' };
    const r = buildReloadlyTopupPayload(
      {
        id: 'ord_test_123456789012',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        amountUsdCents: 9999,
        currency: 'usd',
        pricingSnapshot: { customerProductValueUsdCents: 500 },
      },
      map,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.body.amount, '5.00');
  });

  it('resolveReloadlyOperatorId rejects unmapped operatorKey', () => {
    const r = resolveReloadlyOperatorId('mtn', {});
    assert.equal(r.ok, false);
  });

  it('merged defaults satisfy Afghanistan operator coverage', () => {
    const cov = validateAfghanistanReloadlyOperatorMapCoverage({
      ...RELOADLY_OPERATOR_ID_DEFAULTS,
    });
    assert.equal(cov.ok, true);
  });

  it('assertPhase1FulfillmentQueuePreconditions rejects unpaid order', () => {
    const r = assertPhase1FulfillmentQueuePreconditions({
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      productType: 'mobile_topup',
      currency: 'usd',
      amountUsdCents: 100,
      stripePaymentIntentId: 'pi_test_x',
      completedByWebhookEventId: 'evt_test_y',
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'order_not_paid');
  });

  it('shouldBlockPhase1ReloadlyOutbound blocks development without explicit enable', () => {
    assert.equal(
      shouldBlockPhase1ReloadlyOutbound('development', {
        phase1FulfillmentOutboundEnabled: false,
      }),
      true,
    );
    assert.equal(
      shouldBlockPhase1ReloadlyOutbound('development', {
        phase1FulfillmentOutboundEnabled: true,
      }),
      false,
    );
  });
});
