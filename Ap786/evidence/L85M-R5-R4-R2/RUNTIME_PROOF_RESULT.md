# L-85M-R5-R4-R2 — Runtime proof result

**Gate UTC:** 2026-06-22

---

| Field | Value |
|-------|--------|
| `R4_VERDICT` | **PASS** |
| `R4_HTTP_STATUS` | **200** |
| All required privilege flags | **true** |
| Scoped tables checked | **6** |
| L-85M PASS (staging staging proof endpoint) | **YES** |

## Required flag matrix

| Flag | Value |
|------|--------|
| `readonly_role_expected` | **true** |
| `database_expected` | **true** |
| `role_superuser_false` | **true** |
| `role_createdb_false` | **true** |
| `role_createrole_false` | **true** |
| `select_allowed_all_scoped_tables` | **true** |
| `write_denied_all_scoped_tables` | **true** |
| `no_rows_exported` | **true** |
| `secret_disclosure` | **false** |
| `owner_database_url_fallback_used` | **false** |

---

*End.*
