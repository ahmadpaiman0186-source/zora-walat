# L-84P — Endpoint discovery record

**Verdict:** `CORE10-L84P-VERDICT-002: L84P_AUTHENTICATED_RUNTIME_PROOF_BLOCKED_TOKEN_UNAVAILABLE_NO_SECRET_REVEAL`

**Method:** Read-only repository search only. No runtime mutation.

## Selected endpoint for L-84P

| Field | Value |
|-------|--------|
| **HTTP method** | `GET` |
| **Path** | **`/ops/health`** |
| **Full staging URL (host locked)** | `https://zora-walat-api-staging.vercel.app/ops/health` |

## Code references (read-only)

| Source | Finding |
|--------|---------|
| `server/src/app.js` | Ops router mounted at `/ops` |
| `server/src/routes/ops.routes.js` | `router.get('/health', …)` infra readiness |
| `server/src/middleware/opsInfraHealthGate.js` | `denyUnauthenticatedInfraIfPrelaunch` when `PRELAUNCH_LOCKDOWN` |
| `server/src/config/env.js` | `opsInfraHealthToken` from `OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` |
| `server/test/helpers/prelaunchPrivateSurfaceChild.test.js` | Unauth → **503**; auth via `X-ZW-Ops-Token` → **200** |

## Expected auth contract

| Field | Value |
|-------|-------|
| **Token env (Vercel staging)** | `OPS_HEALTH_TOKEN` |
| **Local operator variable (preferred)** | `ZW_OPS_HEALTH_TOKEN` |
| **Header option A** | `X-ZW-Ops-Token: <token>` |
| **Header option B** | `Authorization: Bearer <token>` |
| **Minimum token length (code)** | **16** chars |

## Expected HTTP outcomes (when executed)

| Call | Expected status | Expected behavior |
|------|-----------------|-------------------|
| Unauthenticated | **503** | Fail-closed `prelaunch_lockdown` |
| Authenticated (valid token) | **200** | Infra health JSON (`server`, `db`, …) |

## Alternate paths considered (not selected for L-84P)

| Path | Reason not primary |
|------|-------------------|
| `GET /ready` | Valid ops surface; L-84P track and L-84M references prefer **`/ops/health`** for ops token proof |
| `GET /health` | Public liveness — does not exercise `OPS_HEALTH_TOKEN` gate |

---

*End.*
