# L-85M-R4 — Ops health comparison (optional)

**Gate UTC:** 2026-06-20

---

## Probe

| Field | Value |
|-------|-------|
| URL | `https://zora-walat-api-staging.vercel.app/ops/health` |
| Method | GET (unauthenticated) |
| Auth | **None** |

## Result

| Field | Value |
|-------|-------|
| HTTP status | **500** |
| Body captured | Empty via PS stream reader; not primary gate target |

## Assessment

| Item | Status |
|------|--------|
| Primary R4 target `/ops/db-readonly-proof` | **401 — PASS (not 404)** |
| `/ops/health` comparison | **INCONCLUSIVE_SERVER_ERROR** for this optional probe |
| R4 structural verdict for db-readonly-proof | **Unchanged — PASS** |

Health 500 does **not** negate db-readonly-proof structural exposure proof; separate ops health investigation deferred.

---

*End.*
