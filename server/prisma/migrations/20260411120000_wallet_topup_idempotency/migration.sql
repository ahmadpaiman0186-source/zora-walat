-- WalletTopupIdempotency: DB-primary idempotency for POST /api/wallet/topup (Idempotency-Key header).
-- Composite unique (userId, idempotencyKey); FK to User ON DELETE CASCADE.
CREATE TABLE "WalletTopupIdempotency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTopupIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletTopupIdempotency_userId_idempotencyKey_key" ON "WalletTopupIdempotency"("userId", "idempotencyKey");

CREATE INDEX "WalletTopupIdempotency_userId_createdAt_idx" ON "WalletTopupIdempotency"("userId", "createdAt");

ALTER TABLE "WalletTopupIdempotency" ADD CONSTRAINT "WalletTopupIdempotency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
