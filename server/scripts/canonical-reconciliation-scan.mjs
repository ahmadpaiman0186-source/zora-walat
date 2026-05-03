/**
 * Read-only reconciliation: compares Stripe-backed orders ↔ CanonicalTransaction mirror.
 * Logs JSON lines only — no automatic fixes (Phase 4 safe mode).
 */
import '../src/config/env.js';
import { prisma } from '../src/db.js';
import { CanonicalTransactionPhase, CanonicalTransactionSourceModel } from '@prisma/client';
import { deriveCanonicalPhaseFromWebTopupOrder } from '../src/domain/canonicalTransactionProjection.js';
import { prismaPhaseFromCanonicalString } from '../src/services/canonicalTransactionSync.js';
import {
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
} from '../src/domain/topupOrder/statuses.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';

const LIMIT = Number(process.env.CANONICAL_RECONCILE_LIMIT ?? 80) || 80;

async function scanWebtopup() {
  const orders = await prisma.webTopupOrder.findMany({
    where: { paymentStatus: PAYMENT_STATUS.PAID },
    orderBy: { paidAt: 'desc' },
    take: LIMIT,
  });

  for (const o of orders) {
    const expected =
      deriveCanonicalPhaseFromWebTopupOrder(o) ?? 'PENDING';
    const canon = await prisma.canonicalTransaction.findUnique({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.WEBTOPUP,
          sourceId: o.id,
        },
      },
    });
    if (!canon) {
      console.log(
        JSON.stringify({
          kind: 'webtopup_missing_canonical',
          orderIdSuffix: o.id.slice(-8),
          paymentIntentIdSuffix: o.paymentIntentId?.slice(-10) ?? null,
        }),
      );
      continue;
    }
    const expectedPhase = prismaPhaseFromCanonicalString(expected);
    if (canon.phase !== expectedPhase) {
      console.log(
        JSON.stringify({
          kind: 'webtopup_phase_mismatch',
          orderIdSuffix: o.id.slice(-8),
          expected: expectedPhase,
          stored: canon.phase,
        }),
      );
    }
    if (
      o.fulfillmentStatus === FULFILLMENT_STATUS.PENDING &&
      o.paymentStatus === PAYMENT_STATUS.PAID &&
      canon.phase !== CanonicalTransactionPhase.PAYMENT_CONFIRMED &&
      canon.phase !== CanonicalTransactionPhase.PROCESSING &&
      canon.phase !== CanonicalTransactionPhase.SUCCESS
    ) {
      console.log(
        JSON.stringify({
          kind: 'paid_but_canonical_not_post_payment_confirm',
          orderIdSuffix: o.id.slice(-8),
          canonicalPhase: canon.phase,
        }),
      );
    }
  }
}

async function scanPhase1Paid() {
  const rows = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.PAID },
    orderBy: { paidAt: 'desc' },
    take: LIMIT,
  });
  for (const row of rows) {
    const canon = await prisma.canonicalTransaction.findUnique({
      where: {
        sourceModel_sourceId: {
          sourceModel: CanonicalTransactionSourceModel.PHASE1,
          sourceId: row.id,
        },
      },
    });
    if (!canon) {
      console.log(
        JSON.stringify({
          kind: 'phase1_missing_canonical',
          checkoutIdSuffix: row.id.slice(-12),
          stripePaymentIntentIdSuffix: row.stripePaymentIntentId?.slice(-12) ?? null,
        }),
      );
      continue;
    }
    if (
      row.stripePaymentIntentId &&
      canon.externalPaymentId &&
      canon.externalPaymentId !== row.stripePaymentIntentId
    ) {
      console.log(
        JSON.stringify({
          kind: 'phase1_pi_mismatch_canonical',
          checkoutIdSuffix: row.id.slice(-12),
        }),
      );
    }
  }
}

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "CanonicalTransaction" LIMIT 1`;
  } catch (e) {
    console.error(
      '[canonical-reconciliation-scan] CanonicalTransaction table missing — apply migrations first.',
      String(e?.message ?? e),
    );
    process.exitCode = 1;
    return;
  }

  await scanWebtopup();
  await scanPhase1Paid();

  console.log(
    JSON.stringify({
      kind: 'canonical_reconcile_scan_complete',
      limit: LIMIT,
      ts: new Date().toISOString(),
    }),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
