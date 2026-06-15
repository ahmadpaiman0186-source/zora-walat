# L-84ZW — Routing gap root cause

**Discovered in:** [L-84ZV](../l84zv-controlled-checkout-negative-post-runtime-proof-2026-06-15/)  
**Probe UTC (L-84ZV):** 2026-06-15T20:53:12Z

---

## Symptom

C1–C4 `POST /api/create-checkout-session` against staging returned **404** with **Next.js HTML** (`404: This page could not be found.`), not JSON **401** / **415** from `slimCreateCheckoutHandler.mjs`.

## Root cause

| Factor | Detail |
|--------|--------|
| **Deploy surface** | Vercel project `zora-walat-api-staging` builds from **repo root** (`vercel.json` + Next.js) |
| **Active root API files** | `api/webhooks/stripe.mjs`, `api/health-ready.mjs` only (pre-L-84ZW) |
| **Checkout handler location** | `server/handlers/slimCreateCheckoutHandler.mjs` reached via `server/api/index.mjs` |
| **Inactive on root deploy** | `server/vercel.json` catch-all → `server/api/index.mjs` **not used** when root is `./` |
| **Missing bridge** | No `api/create-checkout-session.mjs` at repo root |

## Where POST should be handled

1. **Preferred (slim):** `handleSlimCreateCheckoutPost` in `server/handlers/slimCreateCheckoutHandler.mjs`
2. **Entry routing (server):** `server/api/index.mjs` L242–268 — Bearer → slim; no Bearer → **401** JSON
3. **Required on root deploy:** New `api/create-checkout-session.mjs` bridge (L-84J/L-84ZR pattern)

## Why 404 HTML (not API JSON)

Next.js App Router serves its **404 page** for unmatched routes. Without a root serverless function at `/api/create-checkout-session`, the request never reaches checkout auth guards.

## Read-only diagnosis commands

```text
git ls-files | findstr /i "api create-checkout checkout vercel"
git grep -n "create-checkout-session" -- .
git grep -n "slimCreateCheckout" -- .
```

Key files at fix time:

- `api/health-ready.mjs` — health bridge (L-84ZJ)
- `api/webhooks/stripe.mjs` — webhook bridge (pre-L-84ZJ)
- `vercel.json` — rewrites for health + webhook; **no checkout rewrite pre-L-84ZW**
- `server/api/index.mjs` — full slim routing (unreachable from root)

---

*End.*
