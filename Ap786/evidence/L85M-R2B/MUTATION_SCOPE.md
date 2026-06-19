# L-85M-R2B — Mutation scope

**Gate UTC:** 2026-06-19

---

## In scope (this gate)

| Artifact | Change |
|----------|--------|
| `vercel.json` | Add 2 targeted rewrites for `/ops/db-readonly-proof` and `/ops/health` |
| `api/ops/db-readonly-proof.mjs` | **New** root bridge |
| `api/ops/health.mjs` | **New** root bridge |
| `Ap786/evidence/L85M-R2B/` | Evidence pack |

## Out of scope (not mutated)

| Area | Status |
|------|--------|
| `api/webhooks/stripe.mjs` | **Unchanged** |
| Payment / webhook runtime logic | **Unchanged** |
| `server/` runtime source (beyond bridge imports) | **Unchanged** |
| Vercel project settings | **Unchanged** |
| Env vars (`DATABASE_URL`, `READ_ONLY_DATABASE_URL`, `OPS_HEALTH_TOKEN`) | **Unchanged** |
| Tests | **Not added** |
| Deploy / redeploy | **Not performed** |
| Live endpoint calls | **Not performed** |
| DB proof / authenticated proof | **Not performed** |
| Broad `/ops/(.*)` catch-all | **Not added** |

## Design authority

Implementation follows L-85M-R2A [RECOMMENDED_FIX_DESIGN.md](../L85M-R2A/RECOMMENDED_FIX_DESIGN.md) — Option A+B minimal.

---

*End.*
