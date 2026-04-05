-- Referral attribution code used + weekly per-inviter cap.
ALTER TABLE "Referral" ADD COLUMN "referralCodeUsed" TEXT;

ALTER TABLE "ReferralProgramConfig" ADD COLUMN "maxRewardsPerInviterPerWeek" INTEGER NOT NULL DEFAULT 10;
