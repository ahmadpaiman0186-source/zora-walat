-- Institution-grade loyalty ledger (replay-safe credits) + reconciliation scan watermarks.

CREATE TABLE "ReconciliationWatermark" (
    "key" TEXT NOT NULL,
    "cursorAt" TIMESTAMP(3),
    "cursorId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationWatermark_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "LoyaltyLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CREDIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyLedger_sourceId_key" ON "LoyaltyLedger"("sourceId");

CREATE INDEX "LoyaltyLedger_userId_createdAt_idx" ON "LoyaltyLedger"("userId", "createdAt");

ALTER TABLE "LoyaltyLedger" ADD CONSTRAINT "LoyaltyLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill from LoyaltyPointsGrant / ReferralLoyaltyBonus → `20260405125000_loyalty_ledger_backfill_grants`.
-- Referral.updatedAt → `20260404190500_referral_updated_at` (Referral table is created in referral_program).
