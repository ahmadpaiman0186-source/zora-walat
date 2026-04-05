-- WebTopupOrder: fulfillment provider pipeline (no Stripe coupling).
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentProvider" TEXT;
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentAttemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentRequestedAt" TIMESTAMP(3);
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentCompletedAt" TIMESTAMP(3);
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentFailedAt" TIMESTAMP(3);
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentReference" TEXT;
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentErrorCode" TEXT;
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentErrorMessageSafe" TEXT;
ALTER TABLE "WebTopupOrder" ADD COLUMN "lastProviderPayloadHash" TEXT;

CREATE INDEX "WebTopupOrder_fulfillmentStatus_createdAt_idx" ON "WebTopupOrder"("fulfillmentStatus", "createdAt");
