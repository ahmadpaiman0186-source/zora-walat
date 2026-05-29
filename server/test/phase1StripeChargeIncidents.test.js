import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { POST_PAYMENT_INCIDENT_MAP_SOURCE } from '../src/constants/postPaymentIncidentMapSource.js';
import {
  DisputeChargeLookupError,
  resolvePhase1DisputePaymentIntentForWebhook,
  stripePaymentIntentIdFromObject,
  stripePaymentIntentIdFromDispute,
  stripeChargeIdFromDispute,
} from '../src/services/phase1StripeChargeIncidents.js';

describe('phase1StripeChargeIncidents helpers', () => {
  it('reads payment_intent string from charge', () => {
    assert.equal(
      stripePaymentIntentIdFromObject({ payment_intent: 'pi_abc' }),
      'pi_abc',
    );
  });

  it('reads payment_intent object id from charge', () => {
    assert.equal(
      stripePaymentIntentIdFromObject({ payment_intent: { id: 'pi_obj' } }),
      'pi_obj',
    );
  });

  it('reads payment_intent from dispute-shaped object', () => {
    assert.equal(
      stripePaymentIntentIdFromDispute({ payment_intent: 'pi_disp' }),
      'pi_disp',
    );
  });

  it('reads charge id from dispute (string or expanded object)', () => {
    assert.equal(
      stripeChargeIdFromDispute({ charge: 'ch_abc' }),
      'ch_abc',
    );
    assert.equal(
      stripeChargeIdFromDispute({ charge: { id: 'ch_obj' } }),
      'ch_obj',
    );
    assert.equal(stripeChargeIdFromDispute({ charge: 'pi_wrong' }), null);
  });
});

describe('resolvePhase1DisputePaymentIntentForWebhook', () => {
  it('uses payment_intent on dispute without calling charges.retrieve', async () => {
    let calls = 0;
    const stripe = {
      charges: {
        retrieve: async () => {
          calls += 1;
          return { payment_intent: 'pi_should_not_run' };
        },
      },
    };
    const r = await resolvePhase1DisputePaymentIntentForWebhook(
      /** @type {import('stripe').Stripe} */ (/** @type {unknown} */ (stripe)),
      { payment_intent: 'pi_from_payload' },
      null,
    );
    assert.equal(calls, 0);
    assert.equal(r.piId, 'pi_from_payload');
    assert.equal(r.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_PAYLOAD_PI);
  });

  it('calls charges.retrieve when dispute has charge id but no payment_intent', async () => {
    let calls = 0;
    const stripe = {
      charges: {
        retrieve: async () => {
          calls += 1;
          return { id: 'ch_1', object: 'charge', payment_intent: 'pi_retrieved' };
        },
      },
    };
    const r = await resolvePhase1DisputePaymentIntentForWebhook(
      /** @type {import('stripe').Stripe} */ (/** @type {unknown} */ (stripe)),
      { id: 'dp_1', charge: 'ch_1' },
      null,
    );
    assert.equal(calls, 1);
    assert.equal(r.piId, 'pi_retrieved');
    assert.equal(r.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_CHARGE_LOOKUP);
  });

  it('throws DisputeChargeLookupError when charges.retrieve fails', async () => {
    const stripe = {
      charges: {
        retrieve: async () => {
          throw new Error('stripe_down');
        },
      },
    };
    await assert.rejects(
      () =>
        resolvePhase1DisputePaymentIntentForWebhook(
          /** @type {import('stripe').Stripe} */ (/** @type {unknown} */ (stripe)),
          { id: 'dp_x', charge: 'ch_x' },
          null,
        ),
      DisputeChargeLookupError,
    );
  });

  it('returns null resolution without retrieve when dispute has no PI and no charge (unmapped)', async () => {
    const r = await resolvePhase1DisputePaymentIntentForWebhook(
      /** @type {import('stripe').Stripe} */ (/** @type {unknown} */ ({})),
      { id: 'dp_unmapped', object: 'dispute' },
      null,
    );
    assert.equal(r.piId, null);
    assert.equal(r.mapSource, null);
  });
});
