-- Payment order lifecycle + Stripe enrichment (additive).

ALTER TABLE "PaymentCheckout" ADD COLUMN "orderStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PaymentCheckout" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE "PaymentCheckout" ADD COLUMN "clientOrigin" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "metadata" JSONB;
ALTER TABLE "PaymentCheckout" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "completedByWebhookEventId" TEXT;
ALTER TABLE "PaymentCheckout" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "PaymentCheckout" ADD COLUMN "failedAt" TIMESTAMP(3);
ALTER TABLE "PaymentCheckout" ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "PaymentCheckout"
SET "orderStatus" = CASE
  WHEN "status" IN ('INITIATED', 'CHECKOUT_CREATED', 'PAYMENT_PENDING') THEN 'PENDING'
  WHEN "status" = 'PAYMENT_SUCCEEDED' THEN 'PAID'
  WHEN "status" = 'PAYMENT_FAILED' THEN 'FAILED'
  WHEN "status" = 'RECHARGE_PENDING' THEN 'PROCESSING'
  WHEN "status" = 'RECHARGE_COMPLETED' THEN 'FULFILLED'
  WHEN "status" = 'RECHARGE_FAILED' THEN 'FAILED'
  ELSE 'PENDING'
END;

CREATE UNIQUE INDEX "PaymentCheckout_stripePaymentIntentId_key" ON "PaymentCheckout"("stripePaymentIntentId");
CREATE UNIQUE INDEX "PaymentCheckout_completedByWebhookEventId_key" ON "PaymentCheckout"("completedByWebhookEventId");

CREATE INDEX "PaymentCheckout_userId_orderStatus_createdAt_idx" ON "PaymentCheckout"("userId", "orderStatus", "createdAt");
