-- Web top-up reliability: analytics hash, risk, idempotency keys, async jobs.
ALTER TABLE "WebTopupOrder" ADD COLUMN "phoneAnalyticsHash" TEXT;
ALTER TABLE "WebTopupOrder" ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebTopupOrder" ADD COLUMN "riskLevel" TEXT;

CREATE INDEX "WebTopupOrder_phoneAnalyticsHash_idx" ON "WebTopupOrder"("phoneAnalyticsHash");

CREATE TABLE "WebTopupFulfillmentIdempotency" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fulfillmentStatusSnapshot" TEXT,
    "fulfillmentErrorCodeSnapshot" TEXT,
    "attemptNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebTopupFulfillmentIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebTopupFulfillmentIdempotency_orderId_idempotencyKey_key" ON "WebTopupFulfillmentIdempotency"("orderId", "idempotencyKey");

CREATE INDEX "WebTopupFulfillmentIdempotency_orderId_idx" ON "WebTopupFulfillmentIdempotency"("orderId");

CREATE TABLE "WebTopupFulfillmentJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "clientIdempotencyKey" TEXT,
    "status" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebTopupFulfillmentJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebTopupFulfillmentJob_dedupeKey_key" ON "WebTopupFulfillmentJob"("dedupeKey");

CREATE INDEX "WebTopupFulfillmentJob_status_nextRunAt_idx" ON "WebTopupFulfillmentJob"("status", "nextRunAt");
