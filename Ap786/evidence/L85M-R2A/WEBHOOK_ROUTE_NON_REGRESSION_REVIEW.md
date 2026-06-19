# L-85M-R2A — Webhook route non-regression review

**Objective:** Ensure proposed ops mapping fixes do **not** break `POST /webhooks/stripe` on root deploy.

---

## Current webhook chain (must preserve)

```text
POST /webhooks/stripe
  → vercel.json: source /webhooks/stripe → destination /api/webhooks/stripe
  → api/webhooks/stripe.mjs
  → handleSlimStripeWebhookPost(req, res, getExpressHandler)
  → signature verify → Express replay
```

## STR-02 verifier constraints (`verify-str02-root-vercel-route.mjs`)

| Check | Requirement |
|-------|-------------|
| Webhook rewrite | **Must exist** — exact match `/webhooks/stripe` → `/api/webhooks/stripe` |
| Dangerous catch-all | **Must NOT add** `/(.*)` or `/:path*` rewrites (excluding webhook-specific patterns) |
| Bridge file | `api/webhooks/stripe.mjs` must import slim handler — no direct DB/payment mutation |

## Per-option webhook impact

| Option | Webhook impact | Non-regression |
|--------|----------------|----------------|
| **A** — new `api/ops/*` bridges only | **None** if webhook rewrite untouched | **YES** |
| **B** — add **specific** `/ops/...` rewrites | **None** if webhook rewrite unchanged and no catch-all | **YES** |
| **A+B (recommended)** | Additive files + additive rewrites | **YES** — run STR-02 verifier in R2B |
| **C** — Root Directory = `server` | **HIGH RISK** — root `api/webhooks/stripe.mjs` bypassed unless project split | **NO** without major rearchitecture |
| **D** — defer | No change | N/A |

## R2B mandatory checks (design)

1. Do **not** modify `api/webhooks/stripe.mjs` behavior.
2. Do **not** remove or reorder existing webhook rewrite.
3. Do **not** add catch-all `/ops/(.*)` rewrite.
4. Run `npm run verify:str02-route` after R2B mutation (local static).

---

*End.*
