-- WebTopup fulfillment job: lease timestamp for stale processing recovery.
ALTER TABLE "WebTopupFulfillmentJob" ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE INDEX "WebTopupFulfillmentJob_status_processingStartedAt_idx" ON "WebTopupFulfillmentJob"("status", "processingStartedAt");
