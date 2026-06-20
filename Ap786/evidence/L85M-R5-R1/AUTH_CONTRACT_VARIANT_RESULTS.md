# L-85M-R5-R1 — Auth contract variant results

**Gate UTC:** 2026-06-20  
**Target:** `GET https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof`  
**Evidence rule:** no token, no request headers, no raw full response stored.

---

## Tracked contract (source)

| Variant | Header shape | Used in this gate |
|---------|--------------|-------------------|
| Primary | `Authorization: Bearer <OPS_HEALTH_TOKEN>` | **YES** |
| Alternate | `X-ZW-Ops-Token: <token>` | **YES** |
| Not tracked | `x-ops-health-token` | **NO** |

Sources: `server/lib/prebootstrapDbReadonlyProofGuard.mjs`, `server/src/middleware/opsInfraHealthGate.js`, `server/src/services/dbReadonlyProofService.js`.

---

## Variant A — Bearer

| Field | Value |
|-------|--------|
| Variant | `Authorization: Bearer` |
| HTTP status | **401 Unauthorized** |
| `X-Matched-Path` | `/api/ops/db-readonly-proof` |
| Auth accepted | **NO** |
| DB identity proof | **NOT REACHED** |

## Variant B — `X-ZW-Ops-Token`

| Field | Value |
|-------|--------|
| Variant | `X-ZW-Ops-Token` |
| HTTP status | **401 Unauthorized** |
| `X-Matched-Path` | `/api/ops/db-readonly-proof` |
| Auth accepted | **NO** |
| DB identity proof | **NOT REACHED** |

## Matrix

| Variant | HTTP status | Route matched | Auth accepted | Runtime DB proof |
|---------|-------------|---------------|---------------|------------------|
| Bearer | **401** | **YES** | **NO** | **NO** |
| `X-ZW-Ops-Token` | **401** | **YES** | **NO** | **NO** |

## Conclusion

Both tracked auth variants were exercised with Process-scoped `$env:OPS_HEALTH_TOKEN` in the operator session. **Neither variant produced an authenticated success path.** Classification: **`L-85M-R5-R1_AUTH_REJECTED_NOT_PASS`**.

---

*End.*
