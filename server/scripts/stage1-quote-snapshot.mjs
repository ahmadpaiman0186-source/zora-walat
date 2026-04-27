/**
 * Prints the same pricingBreakdown shape as POST /api/checkout-pricing-quote
 * (resolveCheckoutPricing + pricingBreakdownResponseBody + SenderCountry risk buffer from DB).
 * No env overrides — uses server/.env via setupTestEnv.
 *
 * Usage: node --import ./test/setupTestEnv.mjs scripts/stage1-quote-snapshot.mjs
 */
import { prisma } from '../src/db.js';
import { resolveCheckoutPricing } from '../src/domain/pricing/resolveCheckoutPricing.js';
import { pricingBreakdownResponseBody } from '../src/lib/checkoutPricingBreakdown.js';

async function quoteBreakdown(senderCountry, payload) {
  const sender = await prisma.senderCountry.findUnique({
    where: { code: senderCountry },
  });
  if (!sender || !sender.enabled) {
    throw new Error('SENDER_COUNTRY_INVALID');
  }
  const priced = resolveCheckoutPricing({
    packageId: payload.packageId,
    amountCents: payload.amountUsdCents,
    riskBufferPercent: sender.riskBufferPercent,
    senderCountryCode: senderCountry,
  });
  if (!priced.ok) {
    throw new Error(JSON.stringify(priced));
  }
  return pricingBreakdownResponseBody(priced.pricing);
}

async function main() {
  const amount500 = await quoteBreakdown('US', {
    amountUsdCents: 500,
    packageId: undefined,
  });
  const catalogPackage = await quoteBreakdown('US', {
    packageId: 'mock_airtime_10',
    amountUsdCents: undefined,
  });
  console.log(
    JSON.stringify(
      {
        us_amount_500_cents: amount500,
        us_mock_airtime_10: catalogPackage,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
