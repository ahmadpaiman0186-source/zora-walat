# L-85M — Live endpoint proof

**Endpoint:** `GET /ops/db-readonly-proof`  
**Target host marker:** `zora-walat-api-staging`

---

## 1) Authenticated proof attempt

| Field | Value |
|-------|--------|
| Live endpoint called with token | **NO** |
| Block reason | `OPS_HEALTH_TOKEN` not configured in agent process environment (length class: missing_or_short) |
| `.env.local` read | **NO** |
| Token printed | **NO** |

**Fail-closed:** No token → no authenticated live proof executed.

---

## 2) Unauthenticated structural reachability probe

Safe probe only — no token, no response body logged (HTML 404 page not captured).

| Path | HTTP status | Content-Type | JSON |
|------|-------------|--------------|------|
| `/health` | **200** | `application/json` | **YES** |
| `/ops/health` | **404** | `text/html` | **NO** |
| `/ops/db-readonly-proof` | **404** | `text/html` | **NO** |
| `/api/admin/ops/db-readonly-proof` | **404** | `text/html` | **NO** |

---

## 3) Required PASS fields (live)

**Not captured** — endpoint did not return JSON proof payload.

| Flag | Required | Observed |
|------|----------|----------|
| `readonly_role_expected` | true | **N/A** |
| `database_expected` | true | **N/A** |
| `role_superuser_false` | true | **N/A** |
| `role_createdb_false` | true | **N/A** |
| `role_createrole_false` | true | **N/A** |
| `scoped_tables_checked_count` | 6 | **N/A** |
| `select_allowed_all_scoped_tables` | true | **N/A** |
| `write_denied_all_scoped_tables` | true | **N/A** |
| `no_rows_exported` | true | **N/A** |
| `secret_disclosure` | false | **N/A** |
| `owner_database_url_fallback_used` | false | **N/A** |
| `verdict` | PASS | **N/A** |

---

## 4) Endpoint verdict (L-85M)

| Verdict | **BLOCKED** |
|---------|-------------|
| Basis | (1) No ops token for authenticated call; (2) Route **404** on staging — L-85K not live on deployment |

**Not PASS. Not FAIL from endpoint contract** — proof prerequisites unmet.

---

## 5) Safety checks

| Check | Result |
|-------|--------|
| Row export occurred | **NO** |
| Write probe occurred | **NO** |
| Secret disclosure in evidence | **NO** |
| Owner DATABASE_URL fallback used | **UNKNOWN** — no JSON response |

---

*End.*
