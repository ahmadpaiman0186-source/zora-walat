# L-85M-R5-R1 — HTTP status and response shape

**Gate UTC:** 2026-06-20
**Evidence rule:** allowlisted safe fields only — no raw full response, no request headers, no cookies.

---

## Bearer variant (`Authorization: Bearer`)

| Field | Value |
|-------|--------|
| HTTP status | **401 Unauthorized** |
| `Content-Type` | **NOT OBSERVED** (not filed) |
| `X-Matched-Path` | `/api/ops/db-readonly-proof` |
| `body_json_parse` | **NOT OBSERVED** (full body not filed) |
| `verdict` | **NOT OBSERVED** |
| `current_user` / role fields | **NOT OBSERVED** |
| `db_query_performed` | **NOT OBSERVED** |
| `write_probe_occurred` | **NOT OBSERVED** |
| `secret_disclosure` | **NOT OBSERVED** |
| `owner_database_url_fallback_used` | **NOT OBSERVED** |
| `request_error_message` | **NOT OBSERVED** |

## Alternate variant (`X-ZW-Ops-Token`)

| Field | Value |
|-------|--------|
| HTTP status | **401 Unauthorized** |
| `Content-Type` | **NOT OBSERVED** (not filed) |
| `X-Matched-Path` | `/api/ops/db-readonly-proof` |
| `body_json_parse` | **NOT OBSERVED** (full body not filed) |
| `verdict` | **NOT OBSERVED** |
| `current_user` / role fields | **NOT OBSERVED** |
| `db_query_performed` | **NOT OBSERVED** |
| `write_probe_occurred` | **NOT OBSERVED** |
| `secret_disclosure` | **NOT OBSERVED** |
| `owner_database_url_fallback_used` | **NOT OBSERVED** |
| `request_error_message` | **NOT OBSERVED** |

## Structural confirmation

| Field | Value |
|-------|--------|
| Route exposure | **CONFIRMED** — handler path matched |
| Authenticated proof accepted | **NO** — both variants rejected with **401** |

---

*End.*
