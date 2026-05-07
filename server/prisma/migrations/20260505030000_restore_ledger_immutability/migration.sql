-- Restore hard immutability for L4 ledger journal tables.
-- Ledger is append-only: UPDATE/DELETE must always fail.

CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is immutable';
END;
$$ LANGUAGE plpgsql;

