import '../bootstrap.js';
import { prisma } from '../src/db.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';

const queued = await prisma.fulfillmentAttempt.findMany({
  where: { status: FULFILLMENT_ATTEMPT_STATUS.QUEUED },
  take: 15,
  orderBy: { createdAt: 'desc' },
  select: { orderId: true, id: true },
});
const out = [];
for (const q of queued) {
  const o = await prisma.paymentCheckout.findUnique({
    where: { id: q.orderId },
    select: { id: true, orderStatus: true },
  });
  out.push({ attemptId: q.id, orderId: q.orderId, orderStatus: o?.orderStatus });
}
console.log(JSON.stringify({ queuedWithOrder: out }, null, 2));
await prisma.$disconnect();
