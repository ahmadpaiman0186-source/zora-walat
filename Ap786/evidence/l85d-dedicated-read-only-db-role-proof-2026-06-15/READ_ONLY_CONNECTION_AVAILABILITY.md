# L-85D — Read-only connection availability

**Method:** Ephemeral local script scanned candidate env var **names and string lengths only** — **no values printed**.

**Credential source:** `server/.env` + `server/.env.local` via bootstrap (gitignored).

---

## Candidate variables scanned

| Variable | Present | Length (chars) | Usable (≥80) | Dedicated read-only? |
|----------|---------|----------------|--------------|----------------------|
| `DATABASE_URL` | **YES** | 146 | **YES** | **NO** — primary owner connection |
| `TEST_DATABASE_URL` | **YES** | 75 | **NO** | **NO** — integration test URL |
| `READ_ONLY_DATABASE_URL` | **NO** | 0 | — | — |
| `DATABASE_URL_READONLY` | **NO** | 0 | — | — |
| `AUDIT_DATABASE_URL` | **NO** | 0 | — | — |
| `STAGING_DATABASE_URL` | **NO** | 0 | — | — |
| `STAGING_DATABASE_URL_FILE` | **NO** | 0 | — | — |
| `NEON_DATABASE_URL_READONLY` | **NO** | 0 | — | — |

## Tracked repo references

| Location | Read-only DB URL var documented? |
|----------|----------------------------------|
| `server/.env.local.example` | **NO** — only `DATABASE_URL` / `TEST_DATABASE_URL` placeholders (commented) |
| Application source grep | **NO** dedicated read-only connection env name in tracked server code |

---

## Availability verdict

| Flag | Value |
|------|-------|
| **`READ_ONLY_DB_CONNECTION_AVAILABLE`** | **NO** |
| Connection used for privilege probe | `DATABASE_URL` (only usable candidate) |
| **`CONNECTED_ROLE_IS_OWNER_OR_WRITE_CAPABLE`** | **YES** — `neondb_owner` with full DML privileges on probed tables |

---

*End.*
