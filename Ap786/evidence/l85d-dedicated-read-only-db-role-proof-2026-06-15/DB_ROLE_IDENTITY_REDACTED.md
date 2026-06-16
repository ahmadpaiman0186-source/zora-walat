# L-85D — DB role identity (redacted)

**Connection variable used:** `DATABASE_URL` (no dedicated read-only variable available)

**No password or full connection string in this document.**

---

## Redacted connection target

| Field | Value |
|-------|-------|
| Source env var | `DATABASE_URL` |
| Host | `ep-wild-wind-appeopzn-pooler.c-7.us-east-1.aws.neon.tech` |
| Port | `5432` |
| Database | `neondb` |
| SSL mode | `require` |
| URL username present | yes (not printed) |
| URL password present | yes (not printed) |

---

## Session identity (SELECT metadata)

| Field | Value |
|-------|-------|
| `current_user` | **`neondb_owner`** |
| `current_database()` | `neondb` |
| `pg_is_in_recovery()` | `false` |

## Login-capable roles observed (metadata)

| Role | Superuser | Create role | Create DB |
|------|-----------|-------------|-----------|
| `cloud_admin` | true | true | true |
| `neon_service` | false | true | true |
| `neondb_owner` | false | true | true |

No dedicated `*_readonly` login role was observed in the capped listing.

---

## Role classification

| Check | Result |
|-------|--------|
| Dedicated non-owner read-only role used | **NO** |
| Connected role is owner-class / write-capable | **YES** |
| Staging `DATABASE_URL` identity proven | **NO** — see [L-85C](../l85c-operator-redacted-vercel-staging-database-url-identity-attestation-2026-06-15/) |

---

*End.*
