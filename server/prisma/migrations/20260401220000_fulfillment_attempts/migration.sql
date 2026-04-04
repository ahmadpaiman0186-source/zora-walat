-- Fulfillment attempts: async processing boundary (not inside Stripe webhook txn).

CREATE TABLE "FulfillmentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "status" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "providerReference" TEXT,
    "requestSummary" TEXT,
    "responseSummary" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "FulfillmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FulfillmentAttempt_orderId_attemptNumber_key" ON "FulfillmentAttempt"("orderId", "attemptNumber");

CREATE INDEX "FulfillmentAttempt_orderId_status_idx" ON "FulfillmentAttempt"("orderId", "status");

CREATE INDEX "FulfillmentAttempt_status_createdAt_idx" ON "FulfillmentAttempt"("status", "createdAt");

ALTER TABLE "FulfillmentAttempt" ADD CONSTRAINT "FulfillmentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentCheckout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
