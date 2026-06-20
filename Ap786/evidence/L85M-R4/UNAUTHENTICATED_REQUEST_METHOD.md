# L-85M-R4 — Unauthenticated request method

**Gate UTC:** 2026-06-20

---

## Primary probe

| Field | Value |
|-------|-------|
| Method | **GET** |
| URL | `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof` |
| Auth headers | **None** |
| Cookies | **None** |
| Redirects | **Disabled** (`MaximumRedirection 0` / `curl --max-redirs 0`) |
| Timeout | 20s |

## Tooling note

Operator script specified `-SkipHttpErrorCheck` (PowerShell 7+). Local shell returned `ParameterBindingException`; probe completed via:

1. `Invoke-WebRequest` + `WebException.Response` status capture (PS5-compatible)
2. `curl.exe` for response headers/body prefix confirmation

## Boundaries observed

| Boundary | Status |
|----------|--------|
| No `Authorization` header | **YES** |
| No `OPS_HEALTH_TOKEN` | **YES** |
| No POST / mutation verbs | **YES** |

---

*End.*
