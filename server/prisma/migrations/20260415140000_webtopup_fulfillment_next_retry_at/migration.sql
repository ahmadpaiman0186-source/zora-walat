-- WebTopupOrder: scheduled automatic retries after transient fulfillment failures.
ALTER TABLE "WebTopupOrder" ADD COLUMN "fulfillmentNextRetryAt" TIMESTAMP(3);

CREATE INDEX "WebTopupOrder_fulfillmentStatus_fulfillmentNextRetryAt_idx" ON "WebTopupOrder"("fulfillmentStatus", "fulfillmentNextRetryAt");
