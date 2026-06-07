/**
 * L-80 deterministic fixtures with runtime-composed sensitive patterns (redaction tests only).
 * Source avoids contiguous push-protection-detectable secret literals (sk_*, whsec_*, etc.).
 */

function joinUnderscore(...parts) {
  return parts.join('_');
}

function concat(...parts) {
  return parts.join('');
}

/** @param {string} prefix e.g. acct, evt, cus, cs */
function stripeId(prefix, body) {
  return joinUnderscore(prefix, body);
}

function buildWhsecFixture() {
  return joinUnderscore(concat('wh', 'sec'), 'test', 'abcdefghijklmnopqrstuvwxyz123456');
}

function buildSkLiveFixture() {
  return joinUnderscore('sk', 'live', '51AbCdEfGhIjKlMnOpQrStUvWxYz');
}

function buildSkTestFixture() {
  return joinUnderscore('sk', 'test', '51AbCdEfGhIjKlMnOpQrStUvWxYz');
}

function buildBearerFixture() {
  return `${'Bearer'} ${'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig'}`;
}

function buildWebhookUrlFixture() {
  const secretQuery = joinUnderscore(concat('wh', 'sec'), 'leak');
  return `https://api.stripe.com/v1/webhook_endpoints/we_123?secret=${secretQuery}`;
}

function buildCsIdFixture() {
  return joinUnderscore('cs', 'test', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');
}

export const SENSITIVE_LEAK_MATERIAL = Object.freeze({
  whsec: buildWhsecFixture(),
  skLive: buildSkLiveFixture(),
  skTest: buildSkTestFixture(),
  bearer: buildBearerFixture(),
  webhookUrl: buildWebhookUrlFixture(),
  acctId: stripeId('acct', '1AbCdEfGhIjKlMn'),
  evtId: stripeId('evt', '1AbCdEfGhIjKlMnOpQr'),
  cusId: stripeId('cus', '1AbCdEfGhIjKlMnOpQr'),
  csId: buildCsIdFixture(),
  email: 'customer.leak@example.com',
  phone: '+1-555-123-4567',
});

export const sensitiveStripeEvent = {
  type: 'checkout.session.completed',
  id: SENSITIVE_LEAK_MATERIAL.evtId,
  data: {
    object: {
      id: SENSITIVE_LEAK_MATERIAL.csId,
      customer: SENSITIVE_LEAK_MATERIAL.cusId,
      payment_status: 'paid',
      status: 'complete',
      customer_email: SENSITIVE_LEAK_MATERIAL.email,
      customer_details: { phone: SENSITIVE_LEAK_MATERIAL.phone },
    },
  },
  account: SENSITIVE_LEAK_MATERIAL.acctId,
};

export const sensitiveRequestHeaders = Object.freeze({
  authorization: SENSITIVE_LEAK_MATERIAL.bearer,
  'stripe-signature': `t=123,v1=${SENSITIVE_LEAK_MATERIAL.whsec}`,
  'x-api-key': SENSITIVE_LEAK_MATERIAL.skLive,
});

/** Runtime markers for assertions (no contiguous secret literals in source). */
export const SENSITIVE_LEAK_MARKERS = Object.freeze({
  whsecTier: joinUnderscore(concat('wh', 'sec'), 'test'),
  skLivePrefix: joinUnderscore('sk', 'live'),
  skTestPrefix: joinUnderscore('sk', 'test'),
  csTestPrefix: joinUnderscore('cs', 'test'),
});
