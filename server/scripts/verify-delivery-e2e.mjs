/**
 * QA: delivery orchestration — synthetic PAID+QUEUED, mock provider forced for deterministic success.
 * Usage: node scripts/verify-delivery-e2e.mjs
 */
async function main() {
  await import('../bootstrap.js');
  process.env.AIRTIME_PROVIDER = 'mock';
  const { prisma } = await import('../src/db.js');
  const { processFulfillmentForOrder } = await import(
    '../src/services/fulfillmentProcessingService.js'
  );
  const { ORDER_STATUS } = await import('../src/constants/orderStatus.js');
  const { PAYMENT_CHECKOUT_STATUS } = await import(
    '../src/constants/paymentCheckoutStatus.js'
  );

  let qaOrderId = null;
  let createdFixture = false;

  let queued = await prisma.fulfillmentAttempt.findFirst({
    where: { status: 'QUEUED' },
    select: { orderId: true },
  });

  if (!queued) {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      console.log(JSON.stringify({ error: 'no_user_in_db' }));
      await prisma.$disconnect();
      return;
    }
    const suffix = `qa_${Date.now()}`;
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
        packageId: 'qa_verify_pkg',
        paidAt: new Date(),
        completedByWebhookEventId: `evt_${suffix}`,
      },
    });
    await prisma.fulfillmentAttempt.create({
      data: {
        orderId: order.id,
        attemptNumber: 1,
        status: 'QUEUED',
        provider: 'mock',
        requestSummary: JSON.stringify({ phase: 'queued', qa: true }),
      },
    });
    qaOrderId = order.id;
    createdFixture = true;
    queued = { orderId: order.id };
    console.log(JSON.stringify({ createdQaOrder: order.id }, null, 2));
  }

  console.log('\n--- processFulfillmentForOrder (expect deliveryLog lines + delivery_succeeded) ---\n');
  await processFulfillmentForOrder(queued.orderId);

  const orderAfter = await prisma.paymentCheckout.findUnique({
    where: { id: queued.orderId },
    select: { orderStatus: true, status: true },
  });
  const attAfter = await prisma.fulfillmentAttempt.findFirst({
    where: { orderId: queued.orderId, attemptNumber: 1 },
    select: { status: true, providerReference: true },
  });

  const deliveryAudits = await prisma.auditLog.findMany({
    where: {
      payload: { contains: queued.orderId },
      event: { contains: 'delivery' },
    },
    orderBy: { createdAt: 'asc' },
    select: { event: true, payload: true, createdAt: true },
  });

  console.log(
    JSON.stringify(
      {
        orderAfter,
        attemptAfter: attAfter,
        deliveryAuditEvents: deliveryAudits,
      },
      null,
      2,
    ),
  );

  if (orderAfter?.orderStatus === ORDER_STATUS.FULFILLED) {
    console.log('\n--- Second call (terminal noop) ---\n');
    await processFulfillmentForOrder(queued.orderId);
  }

  if (createdFixture && qaOrderId) {
    await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: qaOrderId } });
    await prisma.paymentCheckout.delete({ where: { id: qaOrderId } });
    console.log(JSON.stringify({ cleanedQaOrder: qaOrderId }, null, 2));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
