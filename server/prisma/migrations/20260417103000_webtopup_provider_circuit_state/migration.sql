-- Durable WebTopup provider circuit state (Reloadly multi-instance breaker).
CREATE TABLE "WebtopupProviderCircuitState" (
    "providerId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3),
    "cooldownUntil" TIMESTAMP(3),
    "failureTimestamps" JSONB NOT NULL DEFAULT '[]',
    "halfOpenProbesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebtopupProviderCircuitState_pkey" PRIMARY KEY ("providerId")
);
