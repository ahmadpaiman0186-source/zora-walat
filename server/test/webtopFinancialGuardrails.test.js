import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FINANCIAL_GUARDRAIL_CODES } from '../src/domain/topupOrder/fulfillmentErrors.js';
import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { evaluateWebTopupFinancialGuardrails } from '../src/services/topupFulfillment/webtopFinancialGuardrails.js';
import { executeWebTopupFulfillmentProviderPhase } from '../src/services/topupFulfillment/webTopupFulfillmentExecutor.js';

function baseRow(over = {}) {
  return {
    id: 'tw_ord_test',
    paymentStatus: PAYMENT_STATUS.PAID,
    fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
    amountCents: 1000,
    currency: 'usd',
    paymentIntentId: 'pi_test_123',
    fulfillmentReference: null,
    phoneAnalyticsHash: null,
    ...over,
  };
}

describe('evaluateWebTopupFinancialGuardrails', () => {
  it('passes for healthy paid row', async () => {
    const r = await evaluateWebTopupFinancialGuardrails(
      baseRow({ fulfillmentStatus: FULFILLMENT_STATUS.QUEUED }),
    );
    assert.equal(r.ok, true);
  });

  it('blocks unpaid order (checkout-shaped row)', async () => {
    const r = await evaluateWebTopupFinancialGuardrails(
      baseRow({
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, FINANCIAL_GUARDRAIL_CODES.UNPAID);
  });

  it('blocks invalid amount', async () => {
    const r = await evaluateWebTopupFinancialGuardrails(
      baseRow({ amountCents: 0, fulfillmentStatus: FULFILLMENT_STATUS.QUEUED }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, FINANCIAL_GUARDRAIL_CODES.INVALID_AMOUNT);
  });

  it('blocks unsupported currency', async () => {
    const r = await evaluateWebTopupFinancialGuardrails(
      baseRow({ currency: 'xyz', fulfillmentStatus: FULFILLMENT_STATUS.QUEUED }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, FINANCIAL_GUARDRAIL_CODES.UNSUPPORTED_CURRENCY);
  });

  it('blocks pending payment with queued fulfillment as contradictory', async () => {
    const r = await evaluateWebTopupFinancialGuardrails(
      baseRow({
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY);
  });

  it('blocks paid order without paymentIntentId', async () => {
    const r = await evaluateWebTopupFinancialGuardrails(
      baseRow({ paymentIntentId: null, fulfillmentStatus: FULFILLMENT_STATUS.QUEUED }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY);
  });

  it('does not apply daily cap when phoneAnalyticsHash is missing (no per-destination key)', async () => {
    const prev = process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE;
    process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE = '1';
    try {
      const r = await evaluateWebTopupFinancialGuardrails(
        baseRow({
          fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
          phoneAnalyticsHash: null,
          amountCents: 1000,
        }),
      );
      assert.equal(r.ok, true);
    } finally {
      process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE = prev ?? '';
    }
  });
});

describe('evaluateWebTopupFinancialGuardrails daily cap', { skip: !process.env.DATABASE_URL }, () => {
  it('blocks when rolling sum would exceed cap', async () => {
    const prevCap = process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE;
    process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE = '500';

    const { prisma } = await import('../src/db.js');
    const hash = `test_cap_${Date.now().toString(36)}`;
    const id1 = `tw_ord_cap1_${Date.now().toString(36)}`;

    await prisma.webTopupOrder.create({
      data: {
        id: id1,
        sessionKey: `sess_${hash}`,
        payloadHash: 'a'.repeat(64),
        originCountry: 'US',
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'op',
        operatorLabel: 'Op',
        phoneNumber: '700000000',
        productId: 'p',
        productName: 'P',
        selectedAmountLabel: '4',
        amountCents: 400,
        currency: 'usd',
        paymentIntentId: `pi_${hash}_1`,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        phoneAnalyticsHash: hash,
        updateTokenHash: 'b'.repeat(64),
      },
    });

    try {
      const r = await evaluateWebTopupFinancialGuardrails(
        baseRow({
          id: `tw_ord_cap2_${Date.now().toString(36)}`,
          amountCents: 200,
          phoneAnalyticsHash: hash,
          fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        }),
      );
      assert.equal(r.ok, false);
      assert.equal(r.code, FINANCIAL_GUARDRAIL_CODES.DAILY_CAP);
    } finally {
      await prisma.webTopupOrder.deleteMany({ where: { id: id1 } });
      process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE = prevCap ?? '';
    }
  });
});

describe('executeWebTopupFulfillmentProviderPhase financial block', { skip: !process.env.DATABASE_URL }, () => {
  it('does not call provider when amountCents is invalid', async () => {
    const { prisma } = await import('../src/db.js');
    const id = `tw_ord_fg_${Date.now().toString(36)}`;

    await prisma.webTopupOrder.create({
      data: {
        id,
        sessionKey: `sess_fg_${id.slice(-6)}`,
        payloadHash: 'c'.repeat(64),
        originCountry: 'US',
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'op',
        operatorLabel: 'Op',
        phoneNumber: '700000001',
        productId: 'p',
        productName: 'P',
        selectedAmountLabel: '0',
        amountCents: 0,
        currency: 'usd',
        paymentIntentId: `pi_fg_${id.slice(-8)}`,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        fulfillmentProvider: 'mock',
        fulfillmentAttemptCount: 1,
        updateTokenHash: 'd'.repeat(64),
      },
    });

    try {
      await executeWebTopupFulfillmentProviderPhase(id, undefined, { traceId: 't_fg' });
      const row = await prisma.webTopupOrder.findUnique({ where: { id } });
      assert.ok(row);
      assert.equal(row.fulfillmentStatus, FULFILLMENT_STATUS.FAILED);
      assert.equal(row.fulfillmentErrorCode, FINANCIAL_GUARDRAIL_CODES.INVALID_AMOUNT);
    } finally {
      await prisma.webTopupOrder.deleteMany({ where: { id } });
    }
  });
});
