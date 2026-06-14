# L-84ZJ — Routing fix diff summary

**Verdict:** `CORE10-L84ZJ-VERDICT-PREP: STAGING_API_HEALTH_READY_ROUTING_FIX_PREPARED_NO_REDEPLOY_NO_HTTP_PROOF_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## Runtime / config files

| File | Action | Summary |
|------|--------|---------|
| `vercel.json` | **Modified** | Add 4 health/ready rewrites to single bridge; webhook rewrite preserved |
| `api/health-ready.mjs` | **Added** | Root probe bridge; delegates to slim liveness/readiness handlers |
| `server/test/rootHealthReadyBridge.test.js` | **Added** | Local fail-closed + handler delegation tests |

## Unchanged (explicit)

| File | Status |
|------|--------|
| `api/webhooks/stripe.mjs` | **Unchanged** |
| `server/api/index.mjs` | **Unchanged** |
| `server/vercel.json` | **Unchanged** (inactive on root deploy) |
| Stripe env / Vercel env | **Unchanged** |
| Payment handlers | **Unchanged** |

## Rewrite surface (after merge + future redeploy)

| Public path | Bridge destination |
|-------------|-------------------|
| `/health` | `/api/health-ready?route=health` |
| `/api/health` | `/api/health-ready?route=health` |
| `/ready` | `/api/health-ready?route=ready` |
| `/api/ready` | `/api/health-ready?route=ready` |
| `/webhooks/stripe` | `/api/webhooks/stripe` (unchanged) |

## Expected post-redeploy behavior (hypothesis — not proven in L-84ZJ)

| Path | Expected (after redeploy gate) |
|------|--------------------------------|
| `/health`, `/api/health` | JSON 200 `{ status: 'ok' }` on GET |
| `/ready`, `/api/ready` | JSON readiness on GET (200 or 503) |
| `/api/webhooks/stripe` | Same as L-84ZG (405 on GET/HEAD) |

**L-84ZJ does not claim these outcomes** — HTTP re-proof required in a later gate.

---

*End.*
