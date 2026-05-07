-- SLA breach marker, recovery closed-loop state, fraud risk (FinTech safety).
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "slaBreachedAt" TIMESTAMP(3);
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "recoveryStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "fraudRiskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "fraudSignals" JSONB;

CREATE INDEX IF NOT EXISTS "PaymentCheckout_recoveryStatus_orderStatus_idx"
  ON "PaymentCheckout" ("recoveryStatus", "orderStatus");

CREATE INDEX IF NOT EXISTS "PaymentCheckout_slaBreachedAt_idx"
  ON "PaymentCheckout" ("slaBreachedAt");
