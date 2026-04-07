-- Phase 1: profit-protected mobile top-up (Afghanistan), USD-only checkout, sender country risk buffers.

CREATE TABLE "SenderCountry" (
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "riskBufferPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SenderCountry_pkey" PRIMARY KEY ("code")
);

INSERT INTO "SenderCountry" ("code", "displayName", "enabled", "riskBufferPercent", "notes", "updatedAt") VALUES
('US', 'United States', true, 0.85, 'Phase 1 default risk buffer (% of provider cost)', CURRENT_TIMESTAMP),
('CA', 'Canada', true, 0.90, NULL, CURRENT_TIMESTAMP),
('EU', 'Europe', true, 1.00, 'Aggregated EU senders', CURRENT_TIMESTAMP),
('AE', 'United Arab Emirates', true, 0.95, NULL, CURRENT_TIMESTAMP),
('TR', 'Turkey', true, 1.10, NULL, CURRENT_TIMESTAMP);

ALTER TABLE "PaymentCheckout" ADD COLUMN "senderCountryCode" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'mobile_topup';
ALTER TABLE "PaymentCheckout" ADD COLUMN "providerCostUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "stripeFeeEstimateUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "stripeFeeActualUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "fxBufferUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "riskBufferUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "targetProfitUsdCents" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "projectedNetMarginBp" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "actualNetMarginBp" INTEGER;
ALTER TABLE "PaymentCheckout" ADD COLUMN "pricingSnapshot" JSONB;

CREATE INDEX "PaymentCheckout_senderCountryCode_idx" ON "PaymentCheckout"("senderCountryCode");
