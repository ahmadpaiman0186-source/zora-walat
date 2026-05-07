-- External provider truth + per-checkout trust (financial-grade observability).
ALTER TABLE "PaymentCheckout" ADD COLUMN "providerTruthCheckedAt" TIMESTAMP(3);
ALTER TABLE "PaymentCheckout" ADD COLUMN "providerTruthStatus" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "PaymentCheckout" ADD COLUMN "trustScore" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "PaymentCheckout_providerTruthStatus_idx"
  ON "PaymentCheckout" ("providerTruthStatus");

CREATE INDEX "PaymentCheckout_trustScore_idx"
  ON "PaymentCheckout" ("trustScore");
