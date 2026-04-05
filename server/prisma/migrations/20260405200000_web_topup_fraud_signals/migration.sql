-- Fraud / velocity signal storage on WebTopupOrder (non-blocking flags only).
ALTER TABLE "WebTopupOrder" ADD COLUMN "fraudSignals" JSONB;
