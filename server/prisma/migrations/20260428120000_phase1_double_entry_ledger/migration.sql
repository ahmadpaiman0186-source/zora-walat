-- L4: append-only double-entry journal (distinct from legacy "LedgerEntry" wallet table).
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");

CREATE TABLE "LedgerJournalEntry" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "paymentCheckoutId" TEXT,
    "fulfillmentAttemptId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerJournalEntry_idempotencyKey_key" ON "LedgerJournalEntry"("idempotencyKey");
CREATE INDEX "LedgerJournalEntry_paymentCheckoutId_idx" ON "LedgerJournalEntry"("paymentCheckoutId");
CREATE INDEX "LedgerJournalEntry_fulfillmentAttemptId_idx" ON "LedgerJournalEntry"("fulfillmentAttemptId");

ALTER TABLE "LedgerJournalEntry" ADD CONSTRAINT "LedgerJournalEntry_paymentCheckoutId_fkey" FOREIGN KEY ("paymentCheckoutId") REFERENCES "PaymentCheckout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerJournalEntry" ADD CONSTRAINT "LedgerJournalEntry_fulfillmentAttemptId_fkey" FOREIGN KEY ("fulfillmentAttemptId") REFERENCES "FulfillmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LedgerJournalLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitCents" INTEGER NOT NULL DEFAULT 0,
    "creditCents" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerJournalLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LedgerJournalLine_entryId_idx" ON "LedgerJournalLine"("entryId");
CREATE INDEX "LedgerJournalLine_accountId_idx" ON "LedgerJournalLine"("accountId");

ALTER TABLE "LedgerJournalLine" ADD CONSTRAINT "LedgerJournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LedgerJournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerJournalLine" ADD CONSTRAINT "LedgerJournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default chart (codes consumed by server/src/constants/ledgerAccountCodes.js)
INSERT INTO "LedgerAccount" ("id", "code", "name", "createdAt") VALUES
  ('l4acct_asset_cash_stripe', 'ASSET_CASH_STRIPE', 'Stripe cash-in-transit / clearing (gross collected)', CURRENT_TIMESTAMP),
  ('l4acct_liab_customer', 'LIABILITY_CUSTOMER', 'Customer prepaid obligation until delivery', CURRENT_TIMESTAMP),
  ('l4acct_rev_service_fee', 'REVENUE_SERVICE_FEE', 'Payment processing / platform service fee revenue', CURRENT_TIMESTAMP),
  ('l4acct_exp_provider', 'EXPENSE_PROVIDER_COST', 'Provider cost of goods (recognition)', CURRENT_TIMESTAMP),
  ('l4acct_clearing_provider', 'CLEARING_PROVIDER', 'Amount due to / through provider corridor', CURRENT_TIMESTAMP),
  ('l4acct_rev_platform_net', 'REVENUE_PLATFORM_NET', 'Net platform margin after fee and provider cost', CURRENT_TIMESTAMP);
