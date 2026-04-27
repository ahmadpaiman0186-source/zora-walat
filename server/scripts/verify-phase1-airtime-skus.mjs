/**
 * Verifies each AIRTIME_SKU prices successfully for a typical sender-country risk buffer.
 * Run: node --import ./bootstrap.js scripts/verify-phase1-airtime-skus.mjs (from server/)
 */
import '../bootstrap.js';
import { AIRTIME_SKUS } from '../src/lib/pricing.js';
import { resolveCheckoutPricing } from '../src/domain/pricing/resolveCheckoutPricing.js';

const risk = 5;
let failed = 0;
for (const row of AIRTIME_SKUS) {
  const packageId = `roshan_${row.idSuffix}`;
  const r = resolveCheckoutPricing({
    packageId,
    amountCents: null,
    riskBufferPercent: risk,
  });
  if (!r.ok) {
    console.error('FAIL', packageId, r);
    failed++;
    continue;
  }
  const finalC = r.pricing.finalPriceCents;
  if (finalC !== row.retailUsdCents) {
    console.error('FAIL final mismatch', packageId, 'want', row.retailUsdCents, 'got', finalC);
    failed++;
    continue;
  }
  console.log('ok', packageId, 'finalCents', finalC);
}
process.exit(failed ? 1 : 0);
