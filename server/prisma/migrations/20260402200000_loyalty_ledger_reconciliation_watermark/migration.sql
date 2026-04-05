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

-- Backfill from existing grants (idempotent unique sourceId).
INSERT INTO "LoyaltyLedger" ("id", "userId", "source", "sourceId", "amount", "type", "createdAt")
SELECT
    'll_chk_' || g."paymentCheckoutId",
    g."userId",
    'checkout_grant',
    'checkout_grant:' || g."paymentCheckoutId",
    g."points",
    'CREDIT',
    g."createdAt"
FROM "LoyaltyPointsGrant" g
ON CONFLICT ("sourceId") DO NOTHING;

INSERT INTO "LoyaltyLedger" ("id", "userId", "source", "sourceId", "amount", "type", "createdAt")
SELECT
    'll_rb_' || b."referralId",
    b."userId",
    'referral_bonus',
    'referral_bonus:' || b."referralId",
    b."points",
    'CREDIT',
    b."createdAt"
FROM "ReferralLoyaltyBonus" b
ON CONFLICT ("sourceId") DO NOTHING;

ALTER TABLE "Referral" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Referral_updatedAt_idx" ON "Referral"("updatedAt");
