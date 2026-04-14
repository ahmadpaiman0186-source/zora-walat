-- Email verification timestamp for identity gating (wallet top-up, etc.).
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Existing rows: treat as already verified (no forced OTP migration for legacy accounts).
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
