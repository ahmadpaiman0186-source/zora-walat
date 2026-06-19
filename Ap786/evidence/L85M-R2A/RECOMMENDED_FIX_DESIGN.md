# L-85M-R2A — Recommended fix design

---

## Primary recommendation: **Option A+B (minimal targeted mapping)**

Mirror the **existing Stripe webhook bridge pattern** for ops paths only.

### Design principles

1. **Additive only** — do not change webhook, health, or ready mappings.
2. **Specific paths** — no `/ops/(.*)` catch-all.
3. **Reuse server handlers** — delegate to existing L-85P pre-bootstrap + Express graph.
4. **No Vercel project setting mutation** — tracked code + rewrites only.
5. **No runtime behavior change** — exposure only; same handler semantics as `server/api/index.mjs`.

### Planned artifacts (R2B — not implemented in R2A)

| # | File | Role |
|---|------|------|
| 1 | `vercel.json` | Add 2 rewrites (append after existing entries) |
| 2 | `api/ops/db-readonly-proof.mjs` | GET bridge → `handleSlimDbReadonlyProofPrebootstrapGet` + `getExpressHandler` passThrough |
| 3 | `api/ops/health.mjs` | GET bridge → rewrite `req.url` to `/ops/health` → `getExpressHandler()` |

### Planned `vercel.json` additions (exact intent)

```json
{
  "source": "/ops/db-readonly-proof",
  "destination": "/api/ops/db-readonly-proof"
},
{
  "source": "/ops/health",
  "destination": "/api/ops/health"
}
```

### Bridge behavior (expected after R2B)

**`api/ops/db-readonly-proof.mjs`**

- GET only; 405 otherwise.
- Set `req.url` to `/ops/db-readonly-proof` (preserve query string if any).
- Call `handleSlimDbReadonlyProofPrebootstrapGet` with `passThrough: () => getExpressHandler()(req, res)` — same contract as `server/api/index.mjs` lines 116–127.

**`api/ops/health.mjs`**

- GET only.
- Set `req.url` to `/ops/health`.
- Invoke cached `getExpressHandler()` (same bootstrap pattern as `api/webhooks/stripe.mjs`).

### Explicitly deferred in minimal design

| Path | Reason |
|------|--------|
| `/api/admin/ops/db-readonly-proof` | L-85M target is `/ops/db-readonly-proof`; add only if R4 fails on alias need |
| Full `/ops/*` router | Unnecessary blast radius |
| Option C Root Directory change | High risk — rejected |

### Rejected: Option C

Requires separate operator authorization with explicit dual-project or frontend migration plan — **not justified** when A+B achieves L-85M unblock with lower blast radius.

---

*End.*
