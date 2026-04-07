-- Phase 1 financial truth: provider settlement hints, fulfillment proof, refined margin, anomaly codes.

ALTER TABLE "PaymentCheckout" ADD COLUMN "providerCostActualUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "providerCostTruthSource" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "fulfillmentProviderReference" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "fulfillmentProviderKey" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "fulfillmentTruthSnapshot" JSONB;
ALTER TABLE "PaymentCheckout" ADD COLUMN "financialAnomalyCodes" JSONB;
ALTER TABLE "PaymentCheckout" ADD COLUMN "refinedActualNetMarginBp" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "financialTruthComputedAt" TIMESTAMP(3);
ALTER TABLE "PaymentCheckout" ADD COLUMN "stripeBalanceTransactionAmountCents" INTEGER;
