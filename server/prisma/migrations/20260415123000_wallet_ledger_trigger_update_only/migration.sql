-- `BEFORE DELETE` blocked User cascade-deletes on `User`. Append-only for mutations; allow DELETE for FK cascades.
DROP TRIGGER IF EXISTS trg_user_wallet_ledger_immutable ON "UserWalletLedgerEntry";

CREATE OR REPLACE FUNCTION forbid_user_wallet_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UserWalletLedgerEntry is immutable (no UPDATE)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_wallet_ledger_no_update
BEFORE UPDATE ON "UserWalletLedgerEntry"
FOR EACH ROW
EXECUTE PROCEDURE forbid_user_wallet_ledger_update();

DROP FUNCTION IF EXISTS forbid_user_wallet_ledger_mutate();
