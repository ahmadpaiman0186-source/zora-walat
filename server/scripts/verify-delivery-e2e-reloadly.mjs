/**
 * Sandbox E2E: PAID + QUEUED → processFulfillmentForOrder with AIRTIME_PROVIDER=reloadly.
 * Requires RELOADLY_CLIENT_ID, RELOADLY_CLIENT_SECRET, RELOADLY_SANDBOX=true, RELOADLY_OPERATOR_MAP_JSON.
 *
 * Usage: node scripts/verify-delivery-e2e-reloadly.mjs
 */
async function main() {
  await import('../bootstrap.js');

  if (!process.env.RELOADLY_CLIENT_ID?.trim() || !process.env.RELOADLY_CLIENT_SECRET?.trim()) {
    console.log(
      JSON.stringify({
        skipped: true,
        reason: 'RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET required',
      }),
    );
    return;
  }

  process.env.AIRTIME_PROVIDER = 'reloadly';
  process.env.RELOADLY_SANDBOX = process.env.RELOADLY_SANDBOX ?? 'true';

  const { prisma } = await import('../src/db.js');
  const { processFulfillmentForOrder } = await import(
    '../src/services/fulfillmentProcessingService.js'
  );
  const { ORDER_STATUS } = await import('../src/constants/orderStatus.js');
  const { PAYMENT_CHECKOUT_STATUS } = await import(
    '../src/constants/paymentCheckoutStatus.js'
  );

  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    console.log(JSON.stringify({ error: 'no_user_in_db' }));
    await prisma.$disconnect();
    return;
  }

  const suffix = `rl_${Date.now()}`;
  const order = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: `${suffix}_idem`,
      requestFingerprint: `${suffix}_fp`,
      userId: user.id,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.PAID,
      amountUsdCents: 100,
      currency: 'usd',
      operatorKey: 'roshan',
      recipientNational: '701234567',
      packageId: 'qa_reloadly_pkg',
      paidAt: new Date(),
      completedByWebhookEventId: `evt_${suffix}`,
    },
  });

  await prisma.fulfillmentAttempt.create({
    data: {
      orderId: order.id,
      attemptNumber: 1,
      status: 'QUEUED',
      provider: 'reloadly',
      requestSummary: JSON.stringify({ phase: 'queued', qa: true }),
    },
  });

  console.log('\n--- processFulfillmentForOrder (Reloadly sandbox) — watch deliveryLog JSON lines ---\n');
  await processFulfillmentForOrder(order.id);

  const orderAfter = await prisma.paymentCheckout.findUnique({
    where: { id: order.id },
    select: { orderStatus: true, status: true, failureReason: true },
  });
  const attAfter = await prisma.fulfillmentAttempt.findFirst({
    where: { orderId: order.id, attemptNumber: 1 },
    select: { status: true, providerReference: true, failureReason: true },
  });

  const deliveryAudits = await prisma.auditLog.findMany({
    where: {
      payload: { contains: order.id },
      event: { contains: 'delivery' },
    },
    orderBy: { createdAt: 'asc' },
    select: { event: true, payload: true },
  });

  console.log(
    JSON.stringify(
      {
        orderAfter,
        attemptAfter: attAfter,
        deliveryAuditEvents: deliveryAudits.map((a) => a.event),
        reloadlyProviderRefLooksReal:
          typeof attAfter?.providerReference === 'string' &&
          attAfter.providerReference.startsWith('reloadly_tx_'),
      },
      null,
      2,
    ),
  );

  await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: order.id } });
  await prisma.paymentCheckout.delete({ where: { id: order.id } });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
