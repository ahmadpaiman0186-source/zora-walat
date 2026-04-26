import '../bootstrap.js';
import { prisma } from '../src/db.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/peek-webtop-order.mjs tw_ord_...');
  process.exit(2);
}
const r = await prisma.webTopupOrder.findUnique({ where: { id } });
console.log(JSON.stringify(r, null, 2));
await prisma.$disconnect();
