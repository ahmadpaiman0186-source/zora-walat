# L-85M-R2A — Ops route exposure gap recap

---

## Gap summary (from L-85M-R1, confirmed in R2A)

| Route | In Express / server index | Root rewrite | Root bridge | Staging root deploy |
|-------|---------------------------|--------------|-------------|---------------------|
| `GET /ops/db-readonly-proof` | **YES** | **NO** | **NO** | **404** (L-85M) |
| `GET /api/admin/ops/db-readonly-proof` | **YES** | **NO** | **NO** | **404** |
| `GET /ops/health` | **YES** | **NO** | **NO** | **404** (L-85M) |

## Root cause (static)

Git-connected staging builds **repo root** (`framework: nextjs`). Requests to `/ops/*` hit Next.js routing — **not** `server/api/index.mjs`.

## What is NOT broken

| Route | Status on root deploy |
|-------|----------------------|
| `POST /webhooks/stripe` | **Mapped** |
| `GET /health` | **Mapped** |
| `GET /ready` | **Mapped** (slim ready bridge) |

## Design target for R2B

Expose **only** the minimum ops paths required for L-85M retry chain:

1. `GET /ops/db-readonly-proof` — structural 401 then authenticated proof (R4/R5)
2. `GET /ops/health` — optional infra visibility (same mapping gap)

**Out of scope for minimal fix:** full `/ops/*` catch-all, `/api/admin/ops/*` alias (can be phase 2).

---

*End.*
