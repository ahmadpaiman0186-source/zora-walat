# L-85Q — Structural route verification

**Gate UTC:** 2026-06-17  
**Method:** Unauthenticated `GET` only — no `Authorization` header, no `OPS_HEALTH_TOKEN`

---

## Baseline liveness

| Route | HTTP | Content-Type | JSON | HTML | Elapsed |
|-------|------|--------------|------|------|---------|
| `GET /health` | **200** | `application/json` | **YES** | **NO** | ~638 ms |

Liveness confirmed before proof route probe.

## Primary structural probe: `GET /ops/db-readonly-proof`

Two consecutive unauthenticated probes (determinism check):

| Attempt | HTTP | Content-Type | JSON | HTML | Timeout | 500 | Elapsed |
|---------|------|--------------|------|------|---------|-----|---------|
| 1 | **401** | `application/json` | **YES** | **NO** | **NO** | **NO** | ~282 ms |
| 2 | **401** | `application/json` | **YES** | **NO** | **NO** | **NO** | ~256 ms |

## Safe response flags (both attempts identical)

| Field | Value |
|-------|-------|
| `ok` | `false` |
| `verdict` | `BLOCKED` |
| `reason` | `token_missing` |
| `prebootstrap_guard` | `true` |
| `row_export_occurred` | `false` |
| `secret_disclosure` | `false` |
| `owner_database_url_fallback_used` | `false` |
| `auth_required` | `true` |
| `db_query_performed` | `false` |
| `runtime_db_identity_proof` | `false` |
| `readonly_database_url_proof` | `false` |

**Note:** L-85P contract exposes `row_export_occurred: false` (semantic equivalent to no row export). Field `no_rows_exported` was not present in response body.

## Pass criteria matrix

| Criterion | Met |
|-----------|-----|
| HTTP 401 | **YES** |
| JSON (not HTML) | **YES** |
| `verdict = BLOCKED` | **YES** |
| `reason = token_missing` | **YES** |
| `prebootstrap_guard = true` | **YES** |
| No row export (`row_export_occurred: false`) | **YES** |
| `secret_disclosure = false` | **YES** |
| `owner_database_url_fallback_used = false` | **YES** |
| No password/token/host/URL/connection string in body | **YES** |
| Deterministic (not intermittent 500/timeout) | **YES** |

## Structural verification verdict

**PASS** — unauthenticated fail-closed pre-bootstrap JSON achieved on staging.

## Not performed

| Action | Performed |
|--------|-----------|
| Authenticated request | **NO** |
| DB connect / query | **NO** |
| Row export | **NO** |
| Write probe | **NO** |

---

*End.*
