/**
 * Operator / CI: sandbox readiness + optional order runbook (no secrets, no Reloadly HTTP).
 * Usage:
 *   node scripts/webtopup-reloadly-sandbox-verify.mjs
 *   node scripts/webtopup-reloadly-sandbox-verify.mjs --order=tw_ord_...
 *
 * Requires DATABASE_URL only when --order= is used.
 */
import '../bootstrap.js';

import { prisma } from '../src/db.js';
import {
  buildSandboxProviderReadiness,
  buildFulfillmentRunbookForOrder,
} from '../src/services/topupFulfillment/webTopupFulfillmentRunbook.js';
import { isValidTopupOrderId } from '../src/services/topupOrder/topupOrderService.js';

const orderArg = process.argv.find((a) => a.startsWith('--order='))?.slice(
  '--order='.length,
);

console.log('=== Web top-up — sandbox provider readiness (safe fields) ===\n');
console.log(JSON.stringify(buildSandboxProviderReadiness(), null, 2));

if (orderArg) {
  if (!isValidTopupOrderId(orderArg)) {
    console.error('Invalid order id');
    process.exit(1);
  }
  try {
    const row = await prisma.webTopupOrder.findUnique({
      where: { id: orderArg },
    });
    if (!row) {
      console.error('Order not found');
      process.exit(1);
    }
    console.log('\n=== Order fulfillment runbook (no secrets) ===\n');
    console.log(JSON.stringify(buildFulfillmentRunbookForOrder(row), null, 2));
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
