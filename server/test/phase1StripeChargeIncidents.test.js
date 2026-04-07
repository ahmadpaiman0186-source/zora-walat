import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
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
