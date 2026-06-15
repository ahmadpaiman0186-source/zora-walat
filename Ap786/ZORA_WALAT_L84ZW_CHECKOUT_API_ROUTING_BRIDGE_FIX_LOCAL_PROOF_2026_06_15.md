# L-84ZW — Checkout API routing bridge fix + local proof

**Date:** 2026-06-15  
**Branch (working tree):** `main` @ `0275264` (uncommitted fix + evidence)  
**Phase:** Minimal routing bridge + local tests — **NO RUNTIME POST**  
**Verdict:** `CORE10-L84ZW-VERDICT-001: CHECKOUT_API_ROUTING_BRIDGE_FIX_PROVEN_LOCAL_CODE_TEST_NO_RUNTIME_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## Summary

**L-84ZW** fixes the staging routing gap found in **L-84ZV**: `POST /api/create-checkout-session` returned Next.js **404 HTML** because root Vercel deploy only exposed `api/webhooks/stripe.mjs` and `api/health-ready.mjs`, not checkout.

| Layer | Finding |
|-------|--------|
| **Root cause** | Checkout handler in `server/api/index.mjs` unreachable from root deploy |
| **Fix** | `api/create-checkout-session.mjs` bridge + `vercel.json` rewrite for alias path |
| **Local tests** | **28/28 PASS** across scoped suites + new bridge tests |
| **Runtime POST** | **NOT EXECUTED** |
| **Staging redeploy** | **NOT DONE** (merge + deploy required before L-84ZV-style re-probe) |

## Code changes (minimal)

| File | Change |
|------|--------|
| `api/create-checkout-session.mjs` | **Added** — mirrors index.mjs Bearer → slim / no-Bearer → 401 |
| `vercel.json` | **Modified** — rewrite `/create-checkout-session` → bridge |
| `server/test/rootCreateCheckoutBridge.test.js` | **Added** — local bridge proof |
| `server/test/rootVercelWebhookBridge.test.js` | **Modified** — rewrites list includes checkout |

## Evidence package

[Ap786/evidence/l84zw-checkout-api-routing-bridge-fix-local-proof-2026-06-15/](./evidence/l84zw-checkout-api-routing-bridge-fix-local-proof-2026-06-15/)

**Commit/push:** pending operator approval.

---

*End.*
