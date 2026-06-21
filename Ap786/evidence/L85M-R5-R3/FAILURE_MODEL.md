# L-85M-R5-R3 — Failure model

**Gate UTC:** 2026-06-20

---

## Applied classification

**`AUTHENTICATED_PROOF_RETRY_FAILED_ROUTE_NOT_MATCHED`**

## Decision tree (this gate)

| Step | Result |
|------|--------|
| Local token present | **YES** |
| Local token shape OK | **YES** |
| Endpoint called | **YES** |
| HTTP 200 | **NO** — **500** |
| `X-Matched-Path` = proof route | **NO** — **`/500`** |
| Runtime DB identity JSON proof | **NOT RETURNED** |

## Not applied (first applicable rule wins)

| Classification | Why not |
|----------------|---------|
| `…BLOCKED_LOCAL_TOKEN_SESSION_MISSING…` | Token present |
| `…BLOCKED_LOCAL_TOKEN_SHAPE_INVALID…` | Shape OK |
| `…FAILED_AUTH_REJECTED` | Status **not** 401 with prebootstrap JSON |
| `…FAILED_RUNTIME_DB_OWNER_OR_FALLBACK` | No proof JSON |
| `…FAILED_RUNTIME_DB_IDENTITY_INCONCLUSIVE` | Route not matched — earlier failure class |
| `AUTHENTICATED_READ_ONLY_DB_IDENTITY_PROOF_CONFIRMED` | PASS criteria **not** met |

---

*End.*
