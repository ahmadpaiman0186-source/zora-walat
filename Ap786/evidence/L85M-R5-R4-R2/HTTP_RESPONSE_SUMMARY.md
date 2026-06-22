# L-85M-R5-R4-R2 — HTTP response summary

**Gate UTC:** 2026-06-22

---

| Field | Value |
|-------|--------|
| HTTP status | **200** |
| `R4_RESPONSE_JSON_PRESENT` | **YES** |
| `verdict` | **PASS** |
| `checked_at` | **2026-06-22T18:44:35.567Z** |
| `blocked_reason` | **NONE** |
| `fail_reason` | **NONE** |
| HTML body | **NO** |
| Raw body filed | **NO** (field summary only — no secrets) |

## Safe JSON fields observed (operator capture)

| Field | Value |
|-------|--------|
| `readonly_role_expected` | **true** |
| `database_expected` | **true** |
| `role_superuser_false` | **true** |
| `role_createdb_false` | **true** |
| `role_createrole_false` | **true** |
| `scoped_tables_checked_count` | **6** |
| `select_allowed_all_scoped_tables` | **true** |
| `write_denied_all_scoped_tables` | **true** |
| `no_rows_exported` | **true** |
| `secret_disclosure` | **false** |
| `owner_database_url_fallback_used` | **false** |

---

*End.*
