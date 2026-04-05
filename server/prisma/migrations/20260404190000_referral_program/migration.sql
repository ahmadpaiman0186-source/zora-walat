-- Referral program + promotional wallet bucket (non-withdrawable credits).

ALTER TABLE "UserWallet" ADD COLUMN "promotionalBalanceUsdCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "signupIpHash" TEXT;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

CREATE TABLE "ReferralProgramConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "referralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyBudgetUsdCents" INTEGER NOT NULL DEFAULT 5000,
    "rewardAmountUsdCents" INTEGER NOT NULL DEFAULT 500,
    "minFirstOrderUsdCents" INTEGER NOT NULL DEFAULT 100,
    "maxRewardsPerUser" INTEGER NOT NULL DEFAULT 20,
    "rewardDelayMinutes" INTEGER NOT NULL DEFAULT 5,
    "referralBonusLoyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "pausePausedQueueProcessing" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralProgramConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ReferralProgramConfig" ("id", "referralEnabled", "weeklyBudgetUsdCents", "rewardAmountUsdCents", "minFirstOrderUsdCents", "maxRewardsPerUser", "rewardDelayMinutes", "referralBonusLoyaltyPoints", "pausePausedQueueProcessing", "updatedAt")
VALUES ('default', true, 5000, 500, 100, 20, 5, 0, false, CURRENT_TIMESTAMP);

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "firstOrderId" TEXT,
    "fraudFlags" JSONB,
    "invitedSignupIpHash" TEXT,
    "appliedIpHash" TEXT,
    "appliedDeviceFingerprintHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Referral_invitedUserId_key" ON "Referral"("invitedUserId");
CREATE UNIQUE INDEX "Referral_firstOrderId_key" ON "Referral"("firstOrderId");
CREATE INDEX "Referral_inviterUserId_status_idx" ON "Referral"("inviterUserId", "status");
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReferralRewardTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'referral',
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralRewardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralRewardTransaction_referralId_key" ON "ReferralRewardTransaction"("referralId");
CREATE INDEX "ReferralRewardTransaction_userId_createdAt_idx" ON "ReferralRewardTransaction"("userId", "createdAt");
CREATE INDEX "ReferralRewardTransaction_status_createdAt_idx" ON "ReferralRewardTransaction"("status", "createdAt");

ALTER TABLE "ReferralRewardTransaction" ADD CONSTRAINT "ReferralRewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralRewardTransaction" ADD CONSTRAINT "ReferralRewardTransaction_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReferralLoyaltyBonus" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLoyaltyBonus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralLoyaltyBonus_referralId_key" ON "ReferralLoyaltyBonus"("referralId");
CREATE INDEX "ReferralLoyaltyBonus_userId_idx" ON "ReferralLoyaltyBonus"("userId");

ALTER TABLE "ReferralLoyaltyBonus" ADD CONSTRAINT "ReferralLoyaltyBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralLoyaltyBonus" ADD CONSTRAINT "ReferralLoyaltyBonus_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
