# L-85A — DB access safety attestation

## Access method

| Item | Detail |
|------|--------|
| Credential source | Operator-local `server/.env` + `server/.env.local` (gitignored) via `server/bootstrap.js` |
| Shell `DATABASE_URL` | **Unset** at session start — loaded only after bootstrap import |
| Query runner | Ephemeral Node script under `server/` (deleted immediately after execution; not committed) |
| ORM | Prisma `$queryRaw` tagged templates — **SELECT-only** count/metadata queries |

## Redacted connection target (no secrets)

| Field | Value |
|-------|-------|
| Host suffix | `ep-wild-wind-appeopzn-pooler.c-7.us-east-1.aws.neon.tech` |
| Port | `5432` |
| Database name | `neondb` |
| SSL | `require` |
| Username present | yes (not printed) |
| Password present | yes (not printed) |

## Session identity (from SELECT)

| Field | Value |
|-------|-------|
| `current_user` | `neondb_owner` |
| `current_database()` | `neondb` |
| `pg_is_in_recovery()` | `false` (primary, read-capable) |

## Read-only role attestation

| Check | Result |
|-------|--------|
| Dedicated read-only DB user | **NOT PROVEN** — connected as `neondb_owner` |
| `has_table_privilege(..., 'SELECT')` | **true** on all queried tables |
| `has_table_privilege(..., 'INSERT')` | **true** on all queried tables — user **could** mutate; gate relied on discipline + SELECT-only SQL |

**Mutations executed this gate:** **NONE** — no INSERT / UPDATE / DELETE / DDL.

## Staging runtime DB identity (critical limitation)

| Question | Answer |
|----------|--------|
| Is this Neon endpoint provably the same `DATABASE_URL` bound to **`zora-walat-api-staging`** at L-84ZY probe time? | **NO** — Vercel staging `DATABASE_URL` value is not in git; no operator attestation of hostname match in this gate |
| Can zero counts here prove staging zero-write? | **NO** — only proves zero matching rows **on the database actually connected locally** |

Per [P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md](../../P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md): branch/endpoint identity lives in Neon/Vercel consoles, not tracked sources.

## External audit stores not queried

| Store | Status |
|-------|--------|
| Vercel function logs | **NOT QUERIED** |
| Stripe Dashboard / API | **NOT QUERIED** (forbidden) |
| Provider dashboards | **NOT QUERIED** |
| Non-Prisma log sinks | **NOT QUERIED** |

Webhook non-money audit persistence (when reached) writes `AuditLog` rows via `writeOrderAudit` — included in Prisma `AuditLog` count query. Checkout C1–C4 path does not invoke webhook audit.

---

*End.*
