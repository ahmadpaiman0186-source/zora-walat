-- Payment ↔ fulfillment reconciliation lifecycle (observable ops field).
ALTER TABLE "PaymentCheckout" ADD COLUMN "reconciliationStatus" TEXT NOT NULL DEFAULT 'ok';

CREATE INDEX "PaymentCheckout_reconciliationStatus_orderStatus_idx"
  ON "PaymentCheckout" ("reconciliationStatus", "orderStatus");
