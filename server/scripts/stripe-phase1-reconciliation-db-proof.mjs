#!/usr/bin/env node
/**
 * After a real Phase 1 checkout + webhook (or integration test), prints **stored** linkage:
 * PaymentCheckout → User → StripeWebhookEvent (completedBy) → FulfillmentAttempt rows.
 * No Stripe API calls — evidence from PostgreSQL only.
 *
 * Usage:
 *   node scripts/stripe-phase1-reconciliation-db-proof.mjs <paymentCheckoutId>
 *   npm run proof:sprint5:db -- <paymentCheckoutId>
 */
import '../bootstrap.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

/**
 * @param {string} id
 * @returns {Promise<{ exitCode: number; payload: Record<string, unknown> | null }>}
 */
export async function runPhase1ReconciliationDbProof(id) {
  const prisma = new PrismaClient();
  try {
    const checkout = await prisma.paymentCheckout.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
    if (!checkout) {
      console.error(`[BLOCKER] No PaymentCheckout row for id=${id}`);
      return { exitCode: 1, payload: null };
    }

    const completedEvtId = checkout.completedByWebhookEventId;
    const webhookEvent = completedEvtId
      ? await prisma.stripeWebhookEvent.findUnique({
          where: { id: completedEvtId },
        })
      : null;

    const fulfillmentAttempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: id },
      orderBy: { attemptNumber: 'asc' },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        provider: true,
        providerReference: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const linkageOk =
      Boolean(completedEvtId) &&
      Boolean(webhookEvent) &&
      webhookEvent.id === completedEvtId &&
      checkout.stripePaymentIntentId != null &&
      checkout.stripePaymentIntentId.length > 0;

    const out = {
      paymentCheckoutId: checkout.id,
      orderStatus: checkout.orderStatus,
      checkoutStatus: checkout.status,
      payer: checkout.user
        ? { userId: checkout.user.id, email: checkout.user.email }
        : null,
      stripePaymentIntentId: checkout.stripePaymentIntentId,
      stripeCustomerId: checkout.stripeCustomerId,
      stripeCheckoutSessionId: checkout.stripeCheckoutSessionId,
      completedByWebhookEventId: completedEvtId,
      webhookEventRowExists: Boolean(webhookEvent),
      linkageInvariant:
        linkageOk
          ? 'ok: completedByWebhookEventId matches StripeWebhookEvent row; PI present'
          : 'incomplete: missing PI and/or webhook event row (order not paid via authoritative webhook path yet)',
      fulfillmentAttempts: fulfillmentAttempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        status: a.status,
        provider: a.provider,
        providerReference: a.providerReference,
      })),
      fulfillmentAttemptCount: fulfillmentAttempts.length,
    };

    console.log(JSON.stringify(out, null, 2));
    return { exitCode: linkageOk ? 0 : 2, payload: out };
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const id = String(process.argv[2] ?? '').trim();
  if (!id) {
    console.error(
      'Usage: node scripts/stripe-phase1-reconciliation-db-proof.mjs <paymentCheckoutId>',
    );
    process.exit(1);
  }
  const { exitCode } = await runPhase1ReconciliationDbProof(id);
  process.exit(exitCode);
}
