-- Immutable user wallet ledger + stable business `referenceId` (operator / external correlation).
ALTER TABLE "UserWalletLedgerEntry" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;

UPDATE "UserWalletLedgerEntry" SET "referenceId" = "id" WHERE "referenceId" IS NULL;

ALTER TABLE "UserWalletLedgerEntry" ALTER COLUMN "referenceId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UserWalletLedgerEntry_referenceId_key" ON "UserWalletLedgerEntry"("referenceId");

-- Enforce append-only at database level (Prisma / raw SQL updates must fail).
CREATE OR REPLACE FUNCTION forbid_user_wallet_ledger_mutate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UserWalletLedgerEntry is immutable (no UPDATE or DELETE)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_wallet_ledger_immutable ON "UserWalletLedgerEntry";

CREATE TRIGGER trg_user_wallet_ledger_immutable
BEFORE UPDATE OR DELETE ON "UserWalletLedgerEntry"
FOR EACH ROW
EXECUTE PROCEDURE forbid_user_wallet_ledger_mutate();
