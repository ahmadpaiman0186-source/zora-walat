-- Phase 1: minimal refund/dispute / post-payment incident state (manual-first).

ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "postPaymentIncidentStatus" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "postPaymentIncidentNotes" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "postPaymentIncidentUpdatedAt" TIMESTAMP(3);
