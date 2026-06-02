# L-39 — Uptime / synthetic evidence requirements

**Date:** 2026-06-02

---

## OBS-UPTIME-FRONTEND-001

| Field | Requirement |
|-------|-------------|
| **Scope** | Uptime or synthetic monitor for **frontend** production domain |
| **Production host** | `zorawalat.com` and/or `zora-walat.vercel.app` (prod alias) |
| **Minimum visible** | Monitor name, target URL, check interval, 7d (or agreed) uptime % or pass/fail history |
| **Filename** | `OBS-UPTIME-FRONTEND-001-2026-06-02-redacted.png` |
| **Reject** | Staging hostname only |

## OBS-UPTIME-API-001

| Field | Requirement |
|-------|-------------|
| **Scope** | Uptime or synthetic for **API** production |
| **Production host** | `zora-walat-api.vercel.app` and/or `/api/health`, `/api/ready` on prod |
| **Minimum visible** | Same as frontend row |
| **Filename** | `OBS-UPTIME-API-001-2026-06-02-redacted.png` |

---

## Pass when (future intake)

- Both monitors filed; clearly labeled production; thresholds documented in manifest review.

---

## Does not prove

- Global launch SLO attainment.
- Money-path route coverage unless monitors explicitly include checkout/webhook paths.

*L-39 does not prove uptime.*
