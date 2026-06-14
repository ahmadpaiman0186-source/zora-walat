# L-84ZJ — Staging API health/ready routing fix preparation

**Verdict:** `CORE10-L84ZJ-VERDICT-PREP: STAGING_API_HEALTH_READY_ROUTING_FIX_PREPARED_NO_REDEPLOY_NO_HTTP_PROOF_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## 1. Problem (from L-84ZH + L-84ZG)

| Observation | Evidence class |
|-------------|----------------|
| Staging host reachable | L-84ZG **PARTIAL** |
| `GET /` → Next.js HTML | L-84ZG |
| `/health`, `/ready`, `/api/health`, `/api/ready` → Next.js 404 HTML | L-84ZG |
| `/api/webhooks/stripe` → API JSON 405 on GET/HEAD | L-84ZG |
| Root cause | L-84ZH — root deploy `./`; only webhook has root bridge + rewrite |

## 2. Fix design

### 2.1 Constraints honored

- Preserve existing webhook rewrite and `api/webhooks/stripe.mjs` behavior
- Add **one** serverless function (not four)
- Reuse proven slim handlers from `server/api/index.mjs` graph
- Fail closed: no POST, no secrets/env in JSON, no payment/provider side effects
- Rollback-safe: revert two runtime files + evidence

### 2.2 Implementation

**New:** `api/health-ready.mjs`

- Parses `?route=health|ready` from rewrite destination
- **health:** GET → `{ status: 'ok' }` via `sendLivenessJsonOk`; HEAD → 200 empty
- **ready:** GET only → `handleSlimReady` (bounded DB core probe, conservative JSON)
- Unknown route / direct hit without query → 404 JSON
- Unsupported methods → 405 with explicit `Allow`

**Updated:** `vercel.json`

```json
{ "source": "/health", "destination": "/api/health-ready?route=health" }
{ "source": "/api/health", "destination": "/api/health-ready?route=health" }
{ "source": "/ready", "destination": "/api/health-ready?route=ready" }
{ "source": "/api/ready", "destination": "/api/health-ready?route=ready" }
```

Webhook rewrite **unchanged**.

### 2.3 Function count impact

| Before | After |
|--------|-------|
| `api/webhooks/stripe.mjs` | + `api/health-ready.mjs` |
| **1** root API function | **2** root API functions |

No catch-all rewrite over frontend routes.

## 3. Fail-closed matrix

| Request | Response |
|---------|----------|
| GET `?route=health` | 200 JSON `{ status: 'ok' }` |
| HEAD `?route=health` | 200 empty |
| GET `?route=ready` | 200/503 readiness JSON (no env/secrets) |
| HEAD `?route=ready` | 405 `Allow: GET` |
| POST any | 405 |
| GET without `route` | 404 |

## 4. Local verification (prep gate)

| Test | Scope |
|------|-------|
| `server/test/rootHealthReadyBridge.test.js` | New bridge behavior |
| `server/test/slimReadyEntrypoint.test.js` | Reused readiness handler |
| `npm run verify:str02-route` | Webhook bridge unchanged |

No HTTP probe to staging in this gate.

## 5. Agent boundary

| Action | Performed |
|--------|-----------|
| Code/config prep | **YES** |
| Ap786 evidence | **YES** |
| Vercel redeploy | **NO** |
| Env update | **NO** |
| Stripe/provider | **NO** |
| HTTP POST | **NO** |
| Runtime HTTP proof | **NO** |

## 6. Disposition

**READY_FOR_COMMIT** — operator may commit, open PR, merge, then authorize separate redeploy + HTTP re-proof gates.

---

*End.*
