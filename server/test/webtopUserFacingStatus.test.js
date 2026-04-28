import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { WEBTOP_SLA_ERROR_CODES } from '../src/lib/webtopSlaPolicy.js';
import {
  getWebtopAbuseUserFacing,
  mapWebtopUserFacingStatus,
} from '../src/lib/webtopUserFacingStatus.js';

describe('mapWebtopUserFacingStatus', () => {
  it('maps paid + delivered to final success', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'delivered');
    assert.equal(r.isFinal, true);
    assert.equal(r.isRetryable, false);
    assert.equal(r.nextAction, 'none');
    assert.ok(!r.userMessage.description.toLowerCase().includes('webhook'));
  });

  it('maps pending + PI to payment_processing', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PENDING,
      fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'payment_processing');
    assert.equal(r.nextAction, 'wait');
  });

  it('maps paid + pending fulfillment to payment_confirmed', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'payment_confirmed');
  });

  it('maps queued to processing', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'processing');
  });

  it('maps retrying fulfillment', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.RETRYING,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'retrying');
    assert.equal(r.isRetryable, true);
  });

  it('maps failed + retryable + future next retry to retrying', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: 'provider_timeout',
      fulfillmentNextRetryAt: future,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'retrying');
    assert.equal(r.isFinal, false);
  });

  it('maps SLA total timeout to failed_final without leaking code in copy', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL,
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'failed_final');
    assert.equal(r.isRetryable, false);
    assert.ok(!JSON.stringify(r).includes('sla_timeout'));
  });

  it('maps financial guardrail to contact_support', () => {
    const r = mapWebtopUserFacingStatus({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: 'financial_daily_cap_exceeded',
      paymentIntentId: 'pi_x',
    });
    assert.equal(r.userStatus, 'failed_final');
    assert.equal(r.nextAction, 'contact_support');
    assert.ok(!r.userMessage.description.includes('financial_daily_cap'));
  });
});

describe('getWebtopAbuseUserFacing', () => {
  it('returns polite copy for known abuse reasons', () => {
    const r = getWebtopAbuseUserFacing('abuse_burst_activity', 'legacy');
    assert.equal(r.userStatus, 'rate_limited');
    assert.ok(r.userMessage.title.length > 0);
    assert.ok(!r.userMessage.description.toLowerCase().includes('abuse_'));
    assert.ok(!r.userMessage.description.includes('legacy'));
  });
});
