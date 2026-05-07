-- L4 hard immutability: ledger journal is append-only.
-- Blocks UPDATE and DELETE on headers + lines. INSERT remains allowed.

CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable';
END;
$$ LANGUAGE plpgsql;

-- LedgerJournalEntry
DROP TRIGGER IF EXISTS no_update_ledger_entry ON "LedgerJournalEntry";
CREATE TRIGGER no_update_ledger_entry
BEFORE UPDATE ON "LedgerJournalEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS no_delete_ledger_entry ON "LedgerJournalEntry";
CREATE TRIGGER no_delete_ledger_entry
BEFORE DELETE ON "LedgerJournalEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- LedgerJournalLine
DROP TRIGGER IF EXISTS no_update_ledger_line ON "LedgerJournalLine";
CREATE TRIGGER no_update_ledger_line
BEFORE UPDATE ON "LedgerJournalLine"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS no_delete_ledger_line ON "LedgerJournalLine";
CREATE TRIGGER no_delete_ledger_line
BEFORE DELETE ON "LedgerJournalLine"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

