# L-85M-R1 — Entrypoint and Vercel mapping matrix

---

## Deploy surface comparison

| Surface | Config | Primary handler | Typical trigger |
|---------|--------|-----------------|-----------------|
| **Root** | `vercel.json` | Next.js + root `api/*.mjs` | Git production deploy; Root Directory `.` |
| **Server** | `server/vercel.json` | `server/api/index.mjs` catch-all | CLI `deploy:staging` from `server/` |

## Root `vercel.json` rewrite map

| Public path | Vercel destination | Reaches server code? |
|-------------|-------------------|----------------------|
| `/health`, `/api/health` | `/api/health-ready?route=health` | Root bridge only |
| `/ready`, `/api/ready` | `/api/health-ready?route=ready` | Root bridge → slim ready |
| `/webhooks/stripe` | `/api/webhooks/stripe` | Root bridge → slim webhook → Express |
| `/create-checkout-session` | `/api/create-checkout-session` | Root bridge |
| `/ops/db-readonly-proof` | *(none)* | **NO** |
| `/ops/health` | *(none)* | **NO** |
| `/api/admin/ops/*` | *(none)* | **NO** |

## Server `vercel.json` route map

| Public path | Destination | Notes |
|-------------|-------------|-------|
| `/(.*)` | `/api/index.mjs` | All paths including `/ops/*`, `/webhooks/stripe` |

## Documented root-bridge rationale (`api/health-ready.mjs`, `api/webhooks/stripe.mjs`)

> Staging builds from repo root (`./`), so `server/api/index.mjs` is **not exposed** on root deploy.

## Reconciliation with L-85M live probe (historical, not re-run here)

| Path | Root deploy (inferred) | Server deploy (inferred) |
|------|------------------------|--------------------------|
| `/health` | **200** JSON | **200** JSON |
| `/ops/db-readonly-proof` | **404** HTML | **401/503 JSON** (structural) |
| `/webhooks/stripe` | **Reachable** (invalid sig → fail-closed) | **Reachable** |

---

*End.*
