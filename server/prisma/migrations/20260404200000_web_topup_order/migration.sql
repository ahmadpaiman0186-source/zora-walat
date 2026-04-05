-- CreateTable
CREATE TABLE "WebTopupOrder" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "payloadHash" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "operatorKey" TEXT NOT NULL,
    "operatorLabel" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "selectedAmountLabel" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL,
    "fulfillmentStatus" TEXT NOT NULL,
    "updateTokenHash" TEXT NOT NULL,
    "completedByStripeEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebTopupOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebTopupOrder_idempotencyKey_key" ON "WebTopupOrder"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WebTopupOrder_paymentIntentId_key" ON "WebTopupOrder"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebTopupOrder_completedByStripeEventId_key" ON "WebTopupOrder"("completedByStripeEventId");

-- CreateIndex
CREATE INDEX "WebTopupOrder_sessionKey_createdAt_idx" ON "WebTopupOrder"("sessionKey", "createdAt");

-- CreateIndex
CREATE INDEX "WebTopupOrder_paymentStatus_createdAt_idx" ON "WebTopupOrder"("paymentStatus", "createdAt");
