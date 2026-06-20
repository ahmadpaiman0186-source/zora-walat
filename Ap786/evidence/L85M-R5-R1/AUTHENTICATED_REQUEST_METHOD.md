# L-85M-R5-R1 — Authenticated request method

**Gate UTC:** 2026-06-20

---

## Executed (operator session)

| Field | Value |
|-------|--------|
| URL | `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof` |
| Method | GET |
| Session | PowerShell Process-scoped `$env:OPS_HEALTH_TOKEN` |
| Variants tried | Bearer; `X-ZW-Ops-Token` |
| User-Agent | Not filed (not allowlisted) |

## Outcome

| Variant | HTTP status | Auth accepted |
|---------|-------------|---------------|
| Bearer | **401 Unauthorized** | **NO** |
| `X-ZW-Ops-Token` | **401 Unauthorized** | **NO** |

Classification: **`L-85M-R5-R1_AUTH_REJECTED_NOT_PASS`**

---

*End.*
