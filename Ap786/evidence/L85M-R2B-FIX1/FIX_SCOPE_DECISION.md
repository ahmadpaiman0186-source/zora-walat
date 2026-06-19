# L-85M-R2B-FIX1 — Fix scope decision

**Gate UTC:** 2026-06-19

---

## Decision: **FIX APPLIED**

| Question | Answer |
|----------|--------|
| Failure related to R2B? | **YES** |
| Route mapping files need change? | **NO** — `vercel.json` and bridges already correct |
| Minimal fix | Sync existing test expected `rewrites` inventory |

## Fix applied

| File | Change |
|------|--------|
| `server/test/rootVercelWebhookBridge.test.js` | Append L-85M-R2B ops rewrites to expected `deepEqual` array |

## Rationale for test file change

The failing assertion is a **route-mapping inventory guard** tied directly to `vercel.json`. Updating the expected snapshot is the smallest correction; reverting R2B rewrites would undo authorized route exposure work.

Nominal R2B mutation files (`vercel.json`, `api/ops/*`) required **no further edits**.

## Out of scope (not changed)

| Item | Status |
|------|--------|
| `api/webhooks/stripe.mjs` | Unchanged |
| Payment/webhook/provider runtime | Unchanged |
| New tests added | **NO** |
| Broad `/ops/(.*)` catch-all | **NO** |

---

*End.*
