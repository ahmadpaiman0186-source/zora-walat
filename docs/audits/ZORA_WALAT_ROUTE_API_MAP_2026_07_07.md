# ZORA-WALAT ROUTE & API MAP — 2026-07-07

## Runtime entrypoints

| Entry | Path | Environment |
|-------|------|-------------|
| Long-running API | `server/start.js` → `server/src/app.js` | Local / worker host |
| Vercel server (staging API project) | `server/api/index.mjs` | `zora-walat-api-staging` |
| Root Next bridges | `api/*.mjs` | Root Vercel project (if used) |
| Fulfillment worker | `server/fulfillment-worker.mjs` | Optional queue consumer |

## Deployment target map

| Target | Host / project | Evidence |
|--------|----------------|----------|
| Staging API | `https://zora-walat-api-staging.vercel.app` | L-85M, L-89B conversation evidence |
| Production API (business) | `zora-walat-api` (Vercel) | L-86D scoped DB-readonly proof only |
| Root rewrites | `vercel.json` at repo root | Maps `/webhooks/stripe`, `/ops/*`, checkout |

**Deployment working assumption:** **NOT PROVEN** globally — only specific endpoints proven per gate artifacts.

## 1. Public / liveness routes

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/`, `/health`, `/api/health` | `health.routes.js` / slim bypass | None |
| GET | `/catalog/sender-countries`, `/catalog/airtime` | `catalog.routes.js` | None + rate limit |

## 2. Health / readiness routes

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/ready` | `OPS_HEALTH_TOKEN` if `PRELAUNCH_LOCKDOWN` | DB + subsystem probes |
| GET | `/api/ready` | Same (slim) | `slimReadyHandler.mjs` |
| GET | `/metrics` | Token + `METRICS_PROMETHEUS_ENABLED` | Prometheus text |

## 3. Protected ops routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/ops/health`, `/api/admin/ops/health` | Public; token under prelaunch |
| GET | `/ops/db-readonly-proof` | `OPS_HEALTH_TOKEN` / `X-ZW-Ops-Token` |
| GET | `/ops/phase1-report`, `/ops/summary`, etc. | Staff JWT |
| GET | `/internal/logs/webtopup` | Infra token |
| GET | `/internal/metrics` | Infra token |
| POST | `/internal/staging/shadow-safety-gate/diagnostic-probe` | Staging tier gate |

## 4. Webhook routes

| Method | Path | Body | Verification |
|--------|------|------|--------------|
| POST | `/webhooks/stripe` | Raw JSON | Stripe signature — **before** `express.json()` |

Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.*`, `charge.refunded`, `charge.dispute.created`

## 5. Money / checkout routes (authenticated)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/create-checkout-session`, `/api/create-checkout-session` | Phase-1 Stripe Checkout |
| POST | `/checkout-pricing-quote`, `/api/checkout-pricing-quote` | Blocked countries middleware |
| POST | `/api/topup-orders`, `/api/recharge/*` | Legacy / parallel paths |
| POST | `/api/wallet/topup` | Wallet path |

## 6. Admin / fulfillment mutation routes

| Prefix | Risk | Auth |
|--------|------|------|
| `/api/admin/orders/*` | Fulfillment kick, recovery | Staff |
| `/api/admin/fulfillment-dlq/replay` | **HIGH** — replay | Staff |
| `/api/admin/webtopup/*` | force-deliver, retry | Admin secret + IP allowlist |
| `/api/admin/web-topup-order/*/fulfillment/dispatch` | Provider dispatch | Staff |

## 7. Staging operator slim routes (serverless only)

- `POST /api/ops/staging-verify-operator-email`
- `GET /api/ops/staging-operator-order-status/:suffix`
- `GET /api/ops/staging-operator-phase1-truth/:suffix`
- `GET /api/ops/staging-operator-refundable-candidates`
- `GET /api/ops/staging-operator-refund-target/:suffix`

## 8. Broken / unreachable / stale

| Issue | Path | Status |
|-------|------|--------|
| Imported not mounted | `softLaunchAdmin.routes.js` → `/soft-launch/summary` | **UNREACHABLE** |
| Serverless cold-start | `GET /api/orders/:id/phase1-truth` | **UNRELIABLE** on staging (documented L-89) |
| Dual mount confusion | Payment routes at `/` and `/api` | **DUPLICATE** surface — audit carefully |

## Middleware order (security-relevant)

1. `helmet`, `cors`, request context
2. `/webhooks/stripe` raw body (excluded from JSON parser)
3. `express.json`
4. `blockRestrictedCountries` — `server/src/middleware/blockRestrictedCountries.js`
5. `apiEdgeLimiter` on `/api`
6. Per-route limiters (auth, checkout, webhook, admin)

## Vercel config findings

| File | Finding |
|------|---------|
| `server/vercel.json` | Catch-all → `api/index.mjs` |
| Root `vercel.json` | Explicit rewrites for webhook, health, checkout, ops proof |

---

*Generated from repository inspection. Runtime reachability NOT PROVEN for all routes.*
