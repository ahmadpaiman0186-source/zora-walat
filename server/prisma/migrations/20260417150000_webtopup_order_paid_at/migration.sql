-- WebTopupOrder: canonical paid time for SLA (paid → delivered).
ALTER TABLE "WebTopupOrder" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- Backfill: paid rows without paidAt — approximate from last mutation time.
UPDATE "WebTopupOrder"
SET "paidAt" = "updatedAt"
WHERE "paymentStatus" = 'paid'
  AND "paidAt" IS NULL;

CREATE INDEX IF NOT EXISTS "WebTopupOrder_paymentStatus_paidAt_idx" ON "WebTopupOrder"("paymentStatus", "paidAt");

