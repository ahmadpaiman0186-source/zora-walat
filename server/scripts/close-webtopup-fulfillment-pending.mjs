/**
 * Close fulfillment for an existing paid WebTopupOrder stuck in fulfillmentStatus=pending.
 * Uses the same dispatch path as staff admin (`dispatchWebTopupFulfillment`).
 *
 * Usage (from server/):
 *   node scripts/close-webtopup-fulfillment-pending.mjs
 *   node scripts/close-webtopup-fulfillment-pending.mjs --order=tw_ord_...
 */
import '../bootstrap.js';

import { env } from '../src/config/env.js';
import { prisma } from '../src/db.js';
import {
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
} from '../src/domain/topupOrder/statuses.js';
import { dispatchWebTopupFulfillment } from '../src/services/topupFulfillment/webTopupFulfillmentService.js';

const orderArg = process.argv.find((a) => a.startsWith('--order='))?.slice(
  '--order='.length,
);

const scriptLog = {
  info(o, _m) {
    console.error(JSON.stringify({ level: 'info', ...o }));
  },
  warn(o, _m) {
    console.error(JSON.stringify({ level: 'warn', ...o }));
  },
};

async function main() {
  const provider = String(env.webTopupFulfillmentProvider ?? 'mock').trim();
  const asyncMode = env.webtopupFulfillmentAsync === true;
  const pollMs = env.webtopupFulfillmentJobPollMs ?? 0;

  console.log(
    JSON.stringify(
      {
        phase: 'runtime_fulfillment_mode',
        webTopupFulfillmentProvider: provider,
        webtopupFulfillmentAsync: asyncMode,
        webtopupFulfillmentJobPollMs: pollMs,
      },
      null,
      2,
    ),
  );

  /** @type {string | null} */
  let orderId = orderArg?.trim() || null;
  if (!orderId) {
    const row = await prisma.webTopupOrder.findFirst({
      where: {
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    orderId = row?.id ?? null;
  }

  if (!orderId) {
    console.log(
      JSON.stringify({
        phase: 'no_candidate',
        message:
          'No WebTopupOrder with paid + fulfillment pending. Create one via checkout or pass --order=tw_ord_...',
      }),
    );
    await prisma.$disconnect();
    process.exit(2);
  }

  const before = await prisma.webTopupOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      fulfillmentProvider: true,
      fulfillmentReference: true,
      updatedAt: true,
    },
  });

  console.log(JSON.stringify({ phase: 'before_dispatch', order: before }, null, 2));

  const diag = await dispatchWebTopupFulfillment(orderId, scriptLog, {});

  const after = await prisma.webTopupOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      fulfillmentProvider: true,
      fulfillmentReference: true,
      fulfillmentCompletedAt: true,
      updatedAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        phase: 'after_dispatch',
        diagnostics: diag,
        order: after,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();

  if (after?.fulfillmentStatus !== FULFILLMENT_STATUS.DELIVERED) {
    console.error(
      JSON.stringify({
        phase: 'unexpected_terminal',
        expected: FULFILLMENT_STATUS.DELIVERED,
        got: after?.fulfillmentStatus ?? null,
      }),
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ phase: 'error', message: String(e?.message ?? e) }));
  process.exit(1);
});
