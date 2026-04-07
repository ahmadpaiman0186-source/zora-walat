# Production money path — launch checklist

Use before pointing real customers at Phase 1 MOBILE_TOPUP.

## Environment

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` — PostgreSQL only
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` set; webhook endpoint reachable from Stripe
- [ ] `CLIENT_URL` + explicit `CORS_ORIGINS` (no wildcards)
- [ ] JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) ≥ 32 chars
- [ ] `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` set
- [ ] **No** `DEV_CHECKOUT_AUTH_BYPASS=true`
- [ ] **No** mock airtime/web-top-up in production unless **both** `ALLOW_MOCK_AIRTIME_IN_PRODUCTION` and `ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION` are intentionally set (see `PHASE1_PRODUCTION_SAFETY_GATES.md`)
- [ ] **No** `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true` with `AIRTIME_PROVIDER=reloadly`

## Application

- [ ] `assertProductionMoneyPathSafetyOrExit()` passes at startup (see `server/src/index.js`)
- [ ] Reloadly credentials present when `AIRTIME_PROVIDER=reloadly`
- [ ] `PRELAUNCH_LOCKDOWN=false` for live money routes (or understand 503 behavior)

## Operations

- [ ] Stripe Dashboard: webhook delivery logs monitored
- [ ] Support runbook: `GET /api/orders/:id/phase1-truth` for order truth (signed-in owner)
- [ ] Refunds/disputes: manual via Stripe — see `PHASE1_REFUND_AND_DISPUTE.md`

## Logging / PII

- [ ] HTTP logs use redacted paths (`server/src/config/loggingRedact.js`)
- [ ] `logOpsEvent` / `opsLog` lines use **suffixes** only for order ids — no full phone numbers in structured ops logs

## CI

- [ ] `npm test` (server) and `flutter test` pass on release branch
