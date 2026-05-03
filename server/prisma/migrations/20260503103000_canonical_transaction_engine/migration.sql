-- Additive Phase 4 canonical transaction mirror (rollback: DROP TABLE + DROP TYPEs).

CREATE TYPE "CanonicalTransactionSourceModel" AS ENUM ('WEBTOPUP', 'PHASE1', 'WALLET');

CREATE TYPE "CanonicalTransactionPhase" AS ENUM (
  'PENDING',
  'PAYMENT_INITIATED',
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REFUNDED'
);

CREATE TABLE "CanonicalTransaction" (
    "id" TEXT NOT NULL,
    "sourceModel" "CanonicalTransactionSourceModel" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "provider" TEXT,
    "externalPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "phase" "CanonicalTransactionPhase" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CanonicalTransaction_idempotencyKey_key" ON "CanonicalTransaction"("idempotencyKey");

CREATE UNIQUE INDEX "CanonicalTransaction_sourceModel_sourceId_key" ON "CanonicalTransaction"("sourceModel", "sourceId");

CREATE INDEX "CanonicalTransaction_phase_updatedAt_idx" ON "CanonicalTransaction"("phase", "updatedAt");

CREATE INDEX "CanonicalTransaction_externalPaymentId_idx" ON "CanonicalTransaction"("externalPaymentId");

CREATE INDEX "CanonicalTransaction_userId_idx" ON "CanonicalTransaction"("userId");
