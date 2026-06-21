# L-85M-R5-R3B — R5-R3 failure window

**Gate UTC:** 2026-06-20  
**Sources:** `Ap786/evidence/L85M-R5-R3/` on `main`; local Git commit metadata

---

## Recorded in R5-R3 evidence

| Field | Value |
|-------|--------|
| Gate UTC date | **2026-06-20** |
| Exact request timestamp in evidence | **NOT RECORDED** |
| Target URL | `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof` |
| HTTP status | **500** |
| `X-Matched-Path` | **`/500`** |

## Inferred window (this gate)

| Field | Value |
|-------|--------|
| Proxy anchor | Git commit `74bfad7` author timestamp |
| Anchor UTC | **`2026-06-21T02:02:29Z`** |
| Investigation window (±5 min) | **`2026-06-21T01:57:29Z`** → **`2026-06-21T02:07:29Z`** |
| Window basis | **INFERRED** — not a captured request `Date` header |

## Active production deployment (metadata correlation)

| Field | Value |
|-------|--------|
| Deployment URL label | `zora-walat-api-staging-8mmwndiwj.vercel.app` |
| Deployment ID | `dpl_78SrqBYgzQPUu27bM3aoRM2FwmNb` |
| `createdAt` (ms) | `1782006743345` → **`2026-06-21T01:52:23.345Z`** |
| Superseded by next production deploy | **`2026-06-21T02:21:04.311Z`** (`1782008464311`) |

R5-R3 inferred instant falls **inside** this deployment’s active window.

---

*End.*
