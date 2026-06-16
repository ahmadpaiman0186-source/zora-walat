# L-85G — Execution report

**Date:** 2026-06-16  
**Connect variable:** `READ_ONLY_DATABASE_URL` only (not owner `DATABASE_URL`)  
**Method:** Ephemeral Prisma `$queryRaw` SELECT-only metadata — **no `$executeRaw`**, **no write probes**

---

## A) Git Safety

| Check | Result |
|-------|--------|
| Branch at execution | `main` |
| Working tree (pre-probe) | clean |
| `git diff --check` | OK |
| `server/.vercel` | absent |
| Git add/commit/push | **NOT PERFORMED** |

## B) Secret Safety

| Check | Result |
|-------|--------|
| `READ_ONLY_DATABASE_URL` printed | **NO** |
| Password printed | **NO** |
| Host printed | **NO** |
| Full URL printed | **NO** |
| `.env.local` content read into evidence | **NO** |
| Ephemeral script deleted | **YES** |
| URL value required quote/prefix extraction at runtime | **YES** (malformed paste — prefix stripped in-probe only; operator should fix `.env.local` format) |

## C) DB Identity Proof

| Field | Value |
|-------|-------|
| `current_user` | **`zora_walat_readonly_audit`** |
| `current_user` = `neondb_owner` | **NO** |
| `current_database()` | `neondb` |
| `pg_is_in_recovery()` | false |

## D) Role Admin Flag Proof

| Flag | Value |
|------|-------|
| `rolsuper` | **false** |
| `rolcreatedb` | **false** |
| `rolcreaterole` | **false** |
| `rolreplication` | false |
| `rolcanlogin` | true |

## E) Table Privilege Matrix

See [TABLE_PRIVILEGE_MATRIX.md](./TABLE_PRIVILEGE_MATRIX.md).

## F) Write-Denial Metadata Proof

All six scope tables: **SELECT true**; **INSERT / UPDATE / DELETE / TRUNCATE false** via `has_table_privilege` — **no write probe executed**.

## G) Evidence Files Created

- `Ap786/evidence/L85G/README.md`
- `Ap786/evidence/L85G/EXECUTION_REPORT.md`
- `Ap786/evidence/L85G/TABLE_PRIVILEGE_MATRIX.md`
- `Ap786/evidence/L85G/SECRET_NON_DISCLOSURE_ATTESTATION.md`
- `Ap786/evidence/L85G/NON_CLAIMS.md`

## H) Non-Claims

See [NON_CLAIMS.md](./NON_CLAIMS.md).

## I) Final Verdict

**`PASS_READ_ONLY_ROLE_CONFIRMED`**

Dedicated read-only role **`zora_walat_readonly_audit`** verified via live connection using `READ_ONLY_DATABASE_URL` with SELECT-only metadata queries. **Not** a staging identity or zero-write claim.

---

*End.*
