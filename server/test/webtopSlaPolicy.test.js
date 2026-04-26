import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import {
  __resetWebtopSlaWorkerDedupeForTests,
  evaluateWebtopOrderSla,
  inferSlaActionExecutedFromRow,
  recommendWebtopSlaAction,
} from '../src/lib/webtopSlaPolicy.js';

describe('evaluateWebtopOrderSla', () => {
  const baseT = {
    paymentPendingMaxMs: 1_800_000,
    paidFulfillmentPendingMaxMs: 900_000,
    fulfillmentQueuedMaxMs: 900_000,
    fulfillmentProcessingMaxMs: 1_800_000,
    paidToDeliveredMaxMs: 3_600_000,
    warnRatio: 0.7,
    paidToDeliveredWarnRatio: 0.7,
  };

  afterEach(() => {
    __resetWebtopSlaWorkerDedupeForTests();
  });

  it('returns ok for paid + delivered', () => {
    const now = new Date('2026-04-17T12:00:00.000Z');
    const row = {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      createdAt: new Date('2026-04-17T11:00:00.000Z'),
      updatedAt: new Date('2026-04-17T11:30:00.000Z'),
      fulfillmentRequestedAt: new Date('2026-04-17T11:05:00.000Z'),
    };
    const r = evaluateWebtopOrderSla(row, now, baseT);
    assert.equal(r.slaStatus, 'ok');
  });

  it('warns when payment pending approaches timeout', () => {
    const createdAt = new Date('2026-04-17T10:00:00.000Z');
    const now = new Date('2026-04-17T10:25:00.000Z');
    const elapsed = now.getTime() - createdAt.getTime();
    assert.ok(elapsed < baseT.paymentPendingMaxMs);
    assert.ok(elapsed >= baseT.paymentPendingMaxMs * baseT.warnRatio);
    const row = {
      paymentStatus: PAYMENT_STATUS.PENDING,
      createdAt,
      updatedAt: createdAt,
    };
    const r = evaluateWebtopOrderSla(row, now, baseT);
    assert.equal(r.slaStatus, 'warn');
    assert.equal(r.segments.paymentPending?.status, 'warn');
  });

  it('breaches payment pending timeout', () => {
    const createdAt = new Date('2026-04-17T08:00:00.000Z');
    const now = new Date('2026-04-17T12:00:00.000Z');
    const row = {
      paymentStatus: PAYMENT_STATUS.PENDING,
      createdAt,
      updatedAt: createdAt,
    };
    const r = evaluateWebtopOrderSla(row, now, baseT);
    assert.equal(r.slaStatus, 'breached');
    assert.equal(r.slaReason, 'payment_pending_timeout');
  });

  it('breaches stale queued', () => {
    const reqAt = new Date('2026-04-17T10:00:00.000Z');
    const now = new Date('2026-04-17T10:20:00.000Z');
    const row = {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      createdAt: new Date('2026-04-17T09:00:00.000Z'),
      updatedAt: new Date('2026-04-17T10:01:00.000Z'),
      fulfillmentRequestedAt: reqAt,
    };
    const r = evaluateWebtopOrderSla(row, now, {
      ...baseT,
      fulfillmentQueuedMaxMs: 600_000,
    });
    assert.equal(r.slaStatus, 'breached');
    assert.equal(r.slaReason, 'stale_queued');
  });

  it('does not breach processing SLA when retrying and nextRetryAt is in the future', () => {
    const reqAt = new Date('2026-04-17T08:00:00.000Z');
    const now = new Date('2026-04-17T12:00:00.000Z');
    const nextRetry = new Date('2026-04-17T13:00:00.000Z');
    const row = {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.RETRYING,
      createdAt: reqAt,
      updatedAt: now,
      fulfillmentRequestedAt: reqAt,
      fulfillmentNextRetryAt: nextRetry,
    };
    const r = evaluateWebtopOrderSla(row, now, baseT);
    assert.ok(!r.slaReasons.includes('stale_processing'));
  });

  it('breaches paid_to_delivered when paidAt is older than cap (no other segment breach)', () => {
    const paidAt = new Date('2026-04-17T06:00:00.000Z');
    const now = new Date('2026-04-17T12:00:00.000Z');
    const row = {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: 'provider_timeout',
      paidAt,
      createdAt: paidAt,
      updatedAt: paidAt,
      fulfillmentRequestedAt: new Date('2026-04-17T11:00:00.000Z'),
      fulfillmentNextRetryAt: new Date('2026-04-17T13:00:00.000Z'),
    };
    const r = evaluateWebtopOrderSla(row, now, {
      ...baseT,
      paidToDeliveredMaxMs: 3_600_000,
      paidToDeliveredWarnRatio: 0.7,
    });
    assert.ok(r.slaReasons.includes('paid_to_delivered_breach'));
    assert.equal(r.slaActionRecommended, 'retry_now');
  });

  it('recommends mark_failed when paid_to_delivered breaches and attempts exhausted', () => {
    const ev = {
      slaStatus: 'breached',
      slaReasons: ['paid_to_delivered_breach'],
    };
    const row = { fulfillmentAttemptCount: 5 };
    assert.equal(recommendWebtopSlaAction(ev, row), 'mark_failed');
  });

  it('inferSlaActionExecutedFromRow maps persisted SLA codes', () => {
    assert.equal(
      inferSlaActionExecutedFromRow({ fulfillmentErrorCode: 'sla_timeout_total' }),
      'mark_failed',
    );
    assert.equal(
      inferSlaActionExecutedFromRow({ fulfillmentErrorCode: 'sla_stale_processing' }),
      'retry_now',
    );
    assert.equal(inferSlaActionExecutedFromRow({ fulfillmentErrorCode: null }), null);
  });
});
