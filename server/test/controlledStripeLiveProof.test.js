import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateControlledStripeLiveProofCheckout } from '../src/lib/controlledStripeLiveProof.js';

const baseEv = {
  controlledStripeLiveProof: true,
  localControlledStripeLiveProofBypass: false,
  phase1FulfillmentOutboundEnabled: false,
  stripeLiveProofMaxFinalUsdCents: 100,
  stripeLiveProofAllowedRecipients: ['701234567'],
};

test('inactive when controlledStripeLiveProof is false', () => {
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 999_999,
      recipientNational: null,
      hasOperatorAndRecipient: false,
    },
    { ...baseEv, controlledStripeLiveProof: false },
  );
  assert.equal(r.ok, true);
});

test('rejects when outbound enabled', () => {
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    { ...baseEv, phase1FulfillmentOutboundEnabled: true },
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_outbound');
});

test('rejects amount above cap', () => {
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 101,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    baseEv,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_amount_cap');
});

test('allows at cap with allow-listed recipient', () => {
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 100,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    baseEv,
  );
  assert.equal(r.ok, true);
});

test('rejects missing operator/recipient pair', () => {
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 100,
      recipientNational: null,
      hasOperatorAndRecipient: false,
    },
    baseEv,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_recipient_required');
});

test('local bypass skips amount cap and recipient allow-list', () => {
  const ev = { ...baseEv, localControlledStripeLiveProofBypass: true };
  const overCap = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 9_999_999,
      recipientNational: '0701234567',
      hasOperatorAndRecipient: true,
    },
    ev,
  );
  assert.equal(overCap.ok, true);

  const notListed = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: '0799999999',
      hasOperatorAndRecipient: true,
    },
    ev,
  );
  assert.equal(notListed.ok, true);
});

test('local bypass still rejects outbound fulfillment enabled', () => {
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    {
      ...baseEv,
      localControlledStripeLiveProofBypass: true,
      phase1FulfillmentOutboundEnabled: true,
    },
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_outbound');
});
