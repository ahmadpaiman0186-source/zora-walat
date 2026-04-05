-- Margin intelligence: order-level profitability (admin analytics only; populated at DELIVERED).
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginSellUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginProviderCostUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginProviderCostSource" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginPaymentFeeUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginNetUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginPercentBp" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "marginCalculatedAt" TIMESTAMP(3);
