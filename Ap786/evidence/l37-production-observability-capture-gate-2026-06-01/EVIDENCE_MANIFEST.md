# L-37 — Evidence manifest (capture gate)

**Date:** 2026-06-01
**Parent:** [ZORA_WALAT_L37_PRODUCTION_OBSERVABILITY_CAPTURE_GATE_2026_06_01.md](../../ZORA_WALAT_L37_PRODUCTION_OBSERVABILITY_CAPTURE_GATE_2026_06_01.md)

---

## 1. Category → artifact mapping

| Category | Required artifact | Filename pattern | Status |
|----------|-------------------|------------------|--------|
| Platform / deployment | PNG/PDF dashboard | `OBS-DASH-PLATFORM-*-redacted.png` | **PENDING** |
| API health / deployment | PNG | `OBS-DASH-API-*-redacted.png` | **PENDING** |
| Frontend availability | PNG | `OBS-DASH-FRONTEND-*-redacted.png` | **PENDING** |
| Logs / errors | PNG or redacted JSONL | `OBS-DASH-LOGS-*` / `OBS-LOG-*-redacted.jsonl` | **PENDING** |
| APM / metrics | PNG | `OBS-DASH-APM-*-redacted.png` | **PENDING** |
| Uptime / synthetics | PNG | `OBS-SYNTH-UPTIME-*-redacted.png` | **PENDING** |
| Alert routing | PNG + ticket ref | `OBS-ALERT-ROUTING-*-redacted.png` | **PENDING** |
| Incident / rollback | MD or PNG record | `OBS-INCIDENT-*` / `OBS-RB-*` | **PENDING** |
| Security / audit | PNG | `OBS-DASH-SEC-*-redacted.png` | **PENDING** |
| Money-path | PNG | `OBS-DASH-MONEY-*-redacted.png` | **PENDING** |

---

## 2. Production scope anchors (read-only reference)

| Surface | Production label |
|---------|------------------|
| API Vercel project | `zora-walat-api` |
| API host | `zora-walat-api.vercel.app` (and configured prod aliases) |
| Frontend Vercel project | `zora-walat` |
| Frontend host | `zorawalat.com` |

Evidence must visibly tie to these **production** labels. Staging hostnames (`*-staging*`, sandbox Stripe) → **reject** for production PROVEN rows.

---

## 3. L-36B baseline

| Metric | Value |
|--------|-------|
| L-36B screenshots ingested | **0** |
| L-37 gate filing | **Defines capture path only** |

---

*Manifest rows remain PENDING until operator files redacted artifacts.*
