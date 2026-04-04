-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopupOrder" (
    "id" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL,
    "operatorKey" TEXT NOT NULL,
    "recipientE164" TEXT NOT NULL,
    "recipientNational" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "reloadlyTransactionId" TEXT,
    "reloadlyReference" TEXT,
    "failureReason" TEXT,
    "fraudScore" INTEGER NOT NULL DEFAULT 0,
    "clientIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopupOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelocityWindow" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "windowHour" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VelocityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCheckout" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "status" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "operatorKey" TEXT,
    "recipientNational" TEXT,
    "packageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "TopupOrder_stripePaymentIntentId_key" ON "TopupOrder"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "TopupOrder_idempotencyKey_key" ON "TopupOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TopupOrder_status_createdAt_idx" ON "TopupOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VelocityWindow_phoneHash_windowHour_key" ON "VelocityWindow"("phoneHash", "windowHour");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckout_idempotencyKey_key" ON "PaymentCheckout"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckout_stripeCheckoutSessionId_key" ON "PaymentCheckout"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "PaymentCheckout_status_createdAt_idx" ON "PaymentCheckout"("status", "createdAt");
