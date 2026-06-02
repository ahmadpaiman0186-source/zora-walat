# L-38 — Evidence classification (per screenshot)

**Date:** 2026-06-01
**Method:** Read-only visual review of operator-filed PNGs (no browser navigation by agent)

---

## Classification table

| Filename | Category | Production scope visible? | Proof strength |
|----------|----------|---------------------------|----------------|
| `OBS-DASH-PLATFORM-001-2026-06-01-redacted.png` | **Platform overview** | **YES** — Vercel account projects list includes `zora-walat`, `zora-walat-api`, `zorawalat.com`, `zora-walat-api.vercel.app` (staging `zora-walat-api-staging` also visible in overview — acceptable for platform context, not staging-only proof) | **PARTIAL** — deployment list / usage summary only |
| `OBS-DASH-FRONTEND-001-2026-06-01-redacted.png` | **Frontend production deployment** | **YES** — project `zora-walat`, domains `zorawalat.com`, production deployment **Ready** on `main` | **PARTIAL** — deploy status only |
| `OBS-DASH-API-001-2026-06-01-redacted.png` | **API production deployment** | **YES** — project `zora-walat-api`, domain `zora-walat-api.vercel.app`, production **Ready** | **PARTIAL** — deploy status only |
| `OBS-DASH-API-OBSERVABILITY-001-2026-06-01-redacted.png` | **API observability summary** | **YES** — Vercel-hosted edge requests (6), function invocations (6), error rate 0% (6h window) | **PARTIAL** — basic Vercel metrics only; **not** full APM |
| `OBS-DASH-API-ACTIVE-BRANCHES-001-2026-06-01-redacted.png` | **API active branches / secondary context** | **YES** — `zora-walat-api` project branch list (preview deployments) | **PARTIAL** — secondary context only |

---

## What these screenshots do **not** prove

| Claim | Status |
|-------|--------|
| Full APM / deep metrics | **NOT PROVEN** — Vercel summary panels only |
| Alert routing / policy | **NOT PROVEN** — no alert config or fired drill |
| Uptime / synthetics | **NOT PROVEN** — no synthetic monitor history |
| Incident / on-call routing | **NOT PROVEN** |
| Money-path observability | **NOT PROVEN** — no webhook/money dashboards |
| Restore / rollback drill | **NOT PROVEN** — UI shows rollback affordance only, no drill record |
| Production logs dashboard | **NOT PROVEN** — no dedicated logs panel filed |
| SRE sign-off | **NOT PROVEN** |

---

*Classification is conservative; partial screenshots ≠ full observability.*
