# L-85M-R5-R4 — Authenticated request metadata

**Gate UTC:** 2026-06-21

---

| Field | Value |
|-------|--------|
| URL | `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof` |
| Method | **GET** |
| Calls executed | **1** (exactly one authorized retry) |
| Session | PowerShell Process-scoped `$env:OPS_HEALTH_TOKEN` |
| Header used | `Authorization: Bearer` only (values **not** recorded) |
| `X-ZW-Ops-Token` header | **NOT SENT** (Bearer-only path per accepted contract) |
| Client | `curl.exe` → ephemeral temp files (deleted after safe capture) |
| Response `Date` header | `Sun, 21 Jun 2026 07:58:15 GMT` |

## Not performed

| Item | Status |
|------|--------|
| Retry loop | **NO** |
| Other endpoints | **NO** |
| Token generation | **NO** |
| Env mutation | **NO** |

---

*End.*
