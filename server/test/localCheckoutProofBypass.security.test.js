import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { validateControlledStripeLiveProofCheckout } from '../src/lib/controlledStripeLiveProof.js';
import {
  currentNodeEnvLabel,
  envStrictTrue,
  isLocalControlledStripeLiveProofBypassActive,
} from '../src/lib/localCheckoutProofRuntime.js';

const proofOnBase = {
  controlledStripeLiveProof: true,
  localControlledStripeLiveProofBypass: false,
  phase1FulfillmentOutboundEnabled: false,
  stripeLiveProofMaxFinalUsdCents: 100,
  stripeLiveProofAllowedRecipients: ['701234567'],
};

/** Like production: no explicit `localControlledStripeLiveProofBypass` key → runtime env decides. */
const proofOnBaseImplicitBypass = {
  controlledStripeLiveProof: true,
  phase1FulfillmentOutboundEnabled: false,
  stripeLiveProofMaxFinalUsdCents: 100,
  stripeLiveProofAllowedRecipients: ['701234567'],
};

let saved = {};

beforeEach(() => {
  saved = {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_UNVERIFIED_CHECKOUT: process.env.ALLOW_UNVERIFIED_CHECKOUT,
    ZW_LOCAL_CHECKOUT_PROOF_MODE: process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE,
  };
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function denyArgs() {
  return {
    finalPriceCents: 9_999,
    recipientNational: '0799999999',
    hasOperatorAndRecipient: true,
  };
}

test('runtime bypass: production never bypasses (recipient path)', () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
  assert.equal(currentNodeEnvLabel(), 'production');
  const r = validateControlledStripeLiveProofCheckout(denyArgs(), proofOnBase);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_amount_cap');
});

test('runtime bypass: production never bypasses amount cap specifically', () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 9_999,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    proofOnBase,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_amount_cap');
});

test('runtime bypass: test env never bypasses recipient allow-list', () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: '0799999999',
      hasOperatorAndRecipient: true,
    },
    proofOnBase,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_recipient_denied');
});

test('runtime bypass: test env never bypasses amount cap', () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 500,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    proofOnBase,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_amount_cap');
});

test('runtime bypass: development + both flags bypasses recipient + amount', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), true);
  const r = validateControlledStripeLiveProofCheckout(
    denyArgs(),
    proofOnBaseImplicitBypass,
  );
  assert.equal(r.ok, true);
});

test('runtime bypass: development with only ALLOW_UNVERIFIED_CHECKOUT still blocks', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  delete process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE;
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: '0799999999',
      hasOperatorAndRecipient: true,
    },
    proofOnBase,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_recipient_denied');
});

test('runtime bypass: development with only ZW_LOCAL_CHECKOUT_PROOF_MODE still blocks', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.ALLOW_UNVERIFIED_CHECKOUT;
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
  const r = validateControlledStripeLiveProofCheckout(denyArgs(), proofOnBase);
  assert.equal(r.ok, false);
});

test('runtime bypass: development with neither flag still blocks', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.ALLOW_UNVERIFIED_CHECKOUT;
  delete process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE;
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
  const r = validateControlledStripeLiveProofCheckout(denyArgs(), proofOnBase);
  assert.equal(r.ok, false);
});

test('runtime bypass: newline after true still matches (Windows-friendly trim)', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true\n';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), true);
});

test('runtime bypass: True (mixed case) normalizes to strict true', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'True';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'TRUE';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), true);
});

test('runtime bypass: yes and 1 never enable bypass', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'yes';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = '1';
  assert.equal(isLocalControlledStripeLiveProofBypassActive(), false);
});

test('envStrictTrue: trim + casefold to word true only (not yes/1)', () => {
  assert.equal(envStrictTrue('true'), true);
  assert.equal(envStrictTrue(' True '), true);
  assert.equal(envStrictTrue('TRUE'), true);
  assert.equal(envStrictTrue(undefined), false);
  assert.equal(envStrictTrue('yes'), false);
  assert.equal(envStrictTrue('1'), false);
});

test('runtime bypass does not skip recipient_required', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: null,
      hasOperatorAndRecipient: false,
    },
    proofOnBaseImplicitBypass,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_recipient_required');
});

test('restricted-region middleware remains wired', async () => {
  const m = await import('../src/middleware/blockRestrictedCountries.js');
  assert.equal(typeof m.blockRestrictedCountries, 'function');
});

test('explicit envOverride bypass still works for unit objects (outbound still enforced)', () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_UNVERIFIED_CHECKOUT = 'true';
  process.env.ZW_LOCAL_CHECKOUT_PROOF_MODE = 'true';
  const ev = {
    ...proofOnBase,
    localControlledStripeLiveProofBypass: true,
    phase1FulfillmentOutboundEnabled: true,
  };
  const r = validateControlledStripeLiveProofCheckout(
    {
      finalPriceCents: 50,
      recipientNational: '701234567',
      hasOperatorAndRecipient: true,
    },
    ev,
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, 'stripe_live_proof_outbound');
});
