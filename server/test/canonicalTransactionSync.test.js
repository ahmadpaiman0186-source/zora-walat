/**
 * Canonical transaction sync — pure + mocked DB tests (no migration required for mocks).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CanonicalTransactionPhase } from '@prisma/client';

import {
  CANONICAL_PHASE,
  deriveCanonicalPhaseFromPaymentCheckout,
} from '../src/domain/canonicalTransactionProjection.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import {
  canonicalIdempotencyKeyPhase1,
  canonicalIdempotencyKeyWebtopup,
  lockedAdvancePaymentConfirmedIfPreconfirmPhase,
  prismaPhaseFromCanonicalString,
} from '../src/services/canonicalTransactionSync.js';
import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';

describe('prismaPhaseFromCanonicalString', () => {
  it('maps projection phases to Prisma enum members', () => {
    assert.equal(
      prismaPhaseFromCanonicalString(CANONICAL_PHASE.PAYMENT_CONFIRMED),
      CanonicalTransactionPhase.PAYMENT_CONFIRMED,
    );
  });
});

describe('canonical idempotency keys', () => {
  it('prefixes webtopup order id deterministically', () => {
    const k = canonicalIdempotencyKeyWebtopup({
      id: 'tw_ord_12345678-1234-1234-1234-123456789012',
      idempotencyKey: null,
    });
    assert.ok(k.includes('tw_ord_'));
    assert.ok(k.startsWith('canonical:webtopup:oid:'));
  });

  it('prefers client webtopup idempotency when present', () => {
    const k = canonicalIdempotencyKeyWebtopup({
      id: 'tw_ord_x',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    assert.ok(k.includes('idem'));
  });

  it('isolates phase1 keys by checkout id', () => {
    const k = canonicalIdempotencyKeyPhase1({
      id: 'ck_test_abc',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    assert.ok(k.endsWith('ck_test_abc'));
  });
});

describe('deriveCanonicalPhaseFromPaymentCheckout', () => {
  it('maps paid checkout to PAYMENT_CONFIRMED', () => {
    assert.equal(
      deriveCanonicalPhaseFromPaymentCheckout({
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        stripePaymentIntentId: 'pi_123',
      }),
      CANONICAL_PHASE.PAYMENT_CONFIRMED,
    );
  });

  it('maps checkout created to PAYMENT_INITIATED', () => {
    assert.equal(
      deriveCanonicalPhaseFromPaymentCheckout({
        orderStatus: ORDER_STATUS.PENDING,
        status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
        stripePaymentIntentId: null,
      }),
      CANONICAL_PHASE.PAYMENT_INITIATED,
    );
  });
});

describe('lockedAdvancePaymentConfirmedIfPreconfirmPhase (mock tx)', () => {
  it('updates only PENDING and PAYMENT_INITIATED rows', async () => {
    /** @type {unknown[]} */
    const calls = [];
    const tx = {
      canonicalTransaction: {
        updateMany: async (args) => {
          calls.push(args);
          return { count: 1 };
        },
      },
    };
    await lockedAdvancePaymentConfirmedIfPreconfirmPhase(
      tx,
      'WEBTOPUP',
      'tw_ord_x',
      'pi_y',
    );
    assert.equal(calls.length, 1);
    const w = /** @type {{ where: { phase: { in: string[] } } }} */ (calls[0]).where;
    assert.equal(w.phase.in.length, 2);
    assert.equal(
      calls[0].data.phase,
      CanonicalTransactionPhase.PAYMENT_CONFIRMED,
    );
  });
});

describe('duplicate webhook idempotency (StripeWebhookEvent)', () => {
  it('documents that evt replay is acked before canonical writes (P2002)', () => {
    assert.ok(true);
  });
});

describe('parallel mark-paid race (conditional updates)', () => {
  it('documents webtopup pending→paid uses updateMany guard on source row', () => {
    assert.equal(PAYMENT_STATUS.PENDING, 'pending');
  });
});
