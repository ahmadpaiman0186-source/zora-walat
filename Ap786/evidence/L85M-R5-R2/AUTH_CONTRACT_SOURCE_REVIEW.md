# L-85M-R5-R2 — Auth contract source review

**Gate UTC:** 2026-06-20  
**Method:** tracked source only — no token values read

---

## Request path (root Vercel staging)

1. `vercel.json` rewrite: `/ops/db-readonly-proof` → `/api/ops/db-readonly-proof`
2. `api/ops/db-readonly-proof.mjs` → `handleSlimDbReadonlyProofPrebootstrapGet`
3. Pre-bootstrap guard: `server/lib/prebootstrapDbReadonlyProofGuard.mjs`
4. On pass-through: Express `/ops/db-readonly-proof` → `executeDbReadonlyProof` in `server/src/services/dbReadonlyProofService.js`

## Pre-bootstrap guard decision order

| Step | Condition | HTTP | `reason` |
|------|-----------|------|----------|
| 1 | Configured ops token length **< 16** | **401** | `token_invalid` |
| 2 | No Bearer / `x-zw-ops-token` presented | **401** | `token_missing` |
| 3 | Presented token ≠ configured (timing-safe) | **401** | `token_invalid` |
| 4 | `READ_ONLY_DATABASE_URL` empty | **503** | `readonly_url_missing` |
| 5 | All checks pass | pass-through | — |

## Express-layer guard (`executeDbReadonlyProof`)

Mirrors the same token gates (configured ≥16, token presented, token matches) before DB probe. Missing readonly URL returns **503**, not **401**.

## Token comparison

| Layer | Function | Comparison |
|-------|----------|------------|
| Pre-bootstrap | `timingSafeEqualUtf8(presented, configured)` | timing-safe UTF-8 equality |
| Express service | `opsInfraHealthTokenMatches(req)` | string equality after trim |

## Configured token source (pre-bootstrap)

Reads **`process.env.OPS_HEALTH_TOKEN`** or alias **`OPS_INFRA_HEALTH_TOKEN`** directly — does **not** load `env.js`.

## Configured token source (Express pass-through)

Reads **`env.opsInfraHealthToken`** from `server/src/config/env.js` — same env var names, trimmed.

## R5-R1 alignment

R5-R1 used **`Authorization: Bearer`** and **`X-ZW-Ops-Token`** — both are explicitly accepted in pre-bootstrap and Express layers. **Header contract matches tracked source.**

## Implication for R5-R1 **401**

With token presented on both variants, **401** (not **503**) implies pre-bootstrap steps **1**, **2**, or **3**. Step **4** (`readonly_url_missing`) is **ruled out** by status code alone.

Without filed response `reason`, steps **1** vs **3** (runtime env vs token value) cannot be distinguished from evidence alone.

---

*End.*
