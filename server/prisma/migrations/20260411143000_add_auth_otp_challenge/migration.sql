-- CreateTable
CREATE TABLE "AuthOtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAfter" TIMESTAMP(3) NOT NULL,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "lockedUntil" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthOtpChallenge_email_key" ON "AuthOtpChallenge"("email");

-- CreateIndex
CREATE INDEX "AuthOtpChallenge_expiresAt_idx" ON "AuthOtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthOtpChallenge_lockedUntil_idx" ON "AuthOtpChallenge"("lockedUntil");
