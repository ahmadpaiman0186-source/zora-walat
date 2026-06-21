# L-85M-R5-R3 — Authenticated request method

**Gate UTC:** 2026-06-20

---

| Field | Value |
|-------|--------|
| URL | `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof` |
| Method | **GET** |
| Calls executed | **1** (authorized single retry) |
| Session | PowerShell Process-scoped `$env:OPS_HEALTH_TOKEN` |
| Headers used | `Authorization: Bearer` + `X-ZW-Ops-Token` (values **not** recorded) |
| Client | `curl.exe` with response headers/body to ephemeral temp files (deleted after capture) |

## Not performed

| Item | Status |
|------|--------|
| Token generation | **NO** |
| Env mutation | **NO** |
| Retry loop | **NO** |

---

*End.*
