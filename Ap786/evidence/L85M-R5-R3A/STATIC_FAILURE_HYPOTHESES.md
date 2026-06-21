# L-85M-R5-R3A — Static failure hypotheses

**Gate UTC:** 2026-06-20

---

## Investigation questions — answers

| Question | Answer |
|----------|--------|
| `/ops/db-readonly-proof` expected to reach `/api/ops/db-readonly-proof`? | **YES** — root `vercel.json` rewrite + `api/ops/db-readonly-proof.mjs` |
| Staging API entrypoint owner | **`vercel.json` + `api/ops/*.mjs` bridges** (repo root) |
| Proof route registration file | **`server/src/routes/ops.routes.js`** (+ pre-bootstrap layers) |
| OPS auth middleware file(s) | **`prebootstrapDbReadonlyProofGuard.mjs`**, **`dbReadonlyProofService.js`** |
| Who emits `X-Matched-Path`? | **Vercel platform** (not app code) |
| Rewrite/catch-all to `/500`? | **NO** in tracked config |
| Proof route vs error middleware order | Pre-bootstrap **before** Express; Express `errorHandler` **last** in `app.js` |
| Proof route present @ `e84f007`? | **YES** |
| Missing export/import static gap? | **None found** |
| Failure category from static evidence | **Partially identified — runtime crash likely, not route absence** |

## Ranked hypotheses (static only)

| Rank | Hypothesis | Confidence |
|------|------------|------------|
| 1 | **Unhandled exception during authenticated pass-through** (`getExpressHandler` bootstrap/Express/DB proof) → Vercel **500** `/500` | **HIGH** (fits R5-R1 vs R5-R3 delta) |
| 2 | Static rewrite/handler absence | **LOW** (contradicted by source + R5-R1 `X-Matched-Path`) |
| 3 | Pure route mismatch | **LOW** |
| 4 | Exact throw site / stack | **INCONCLUSIVE** (no runtime logs in this gate) |

## R5-R1 → R5-R3 delta (leading static story)

R5-R1 stopped at pre-bootstrap **401** (token rejected) — proof route matched. R5-R3 had valid local token shape and reached **500** platform surface — consistent with **entering pass-through** then ** crashing**, not with missing route registration.

---

*End.*
