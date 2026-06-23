# L-86D — Authenticated request metadata

**Gate UTC:** 2026-06-23

---

| Field | Value |
|-------|--------|
| `L86D_TARGET_PROJECT` | `zora-walat-api` |
| URL | `https://zora-walat-api.vercel.app/ops/db-readonly-proof` |
| Method | GET |
| Auth | `Authorization: Bearer <OPS_HEALTH_TOKEN>` — **value not stored** |
| Request count | **1** |
| Second request | **NO** |
| Executed by | Operator workstation (agent shell lacked token) |
| Session token cleared post-request | **YES** (`L86D_SESSION_TOKEN_CLEARED=True`) |
| Staging endpoint called | **NO** |

## Response recording policy

Allowlisted JSON proof fields only; no raw Authorization header; no token-bearing fields; no connection strings.

---

*End.*
