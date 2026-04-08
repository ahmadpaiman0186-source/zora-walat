-- Append-only user wallet ledger (audit / reconciliation foundation). Running balance remains on UserWallet.
CREATE TABLE "UserWalletLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balanceAfterUsdCents" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserWalletLedgerEntry_userId_idempotencyKey_key" ON "UserWalletLedgerEntry"("userId", "idempotencyKey");

CREATE INDEX "UserWalletLedgerEntry_userId_createdAt_idx" ON "UserWalletLedgerEntry"("userId", "createdAt");

ALTER TABLE "UserWalletLedgerEntry" ADD CONSTRAINT "UserWalletLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
