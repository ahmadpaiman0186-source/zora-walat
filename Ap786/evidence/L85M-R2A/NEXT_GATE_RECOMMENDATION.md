# L-85M-R2A — Next gate recommendation

---

## Recommended next gate: **L-85M-R2B — tracked route mapping mutation, no deploy**

| Field | Value |
|-------|--------|
| Scope | Implement **Option A+B minimal** per [RECOMMENDED_FIX_DESIGN.md](./RECOMMENDED_FIX_DESIGN.md) |
| Deploy | **NO** in R2B |
| Endpoint calls | **NO** in R2B |
| DB proof | **NO** in R2B |

### R2B deliverables (planned)

1. `vercel.json` — 2 additive rewrites
2. `api/ops/db-readonly-proof.mjs` — new bridge
3. `api/ops/health.mjs` — new bridge
4. Evidence under `Ap786/evidence/L85M-R2B/`
5. Run `verify:str02-route` + `secrets:scan`

### After R2B (not in R2B)

| Gate | Purpose |
|------|---------|
| R3 | Deploy pickup |
| R4 | Structural 401 (not 404) |
| R5 | L-85M authenticated proof |

## Not recommended now

- **Option C** — Root Directory mutation
- **Option D** — further defer (design sufficient)
- **L-86E-1** — remains **deferred**
- **PR #5** merge/close

## PR #5

**KEEP_OPEN_BLOCKED** — unchanged.

---

*End.*
