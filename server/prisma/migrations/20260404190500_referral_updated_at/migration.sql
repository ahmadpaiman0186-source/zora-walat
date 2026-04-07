-- Referral row updates (runs immediately after Referral table is created in referral_program).

ALTER TABLE "Referral" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Referral_updatedAt_idx" ON "Referral"("updatedAt");
