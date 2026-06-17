# L-85J — Read-only runtime proof design

**Status:** DESIGN ONLY — no implementation, no deploy, no env mutation, no HTTP call.

---

## 1) Problem statement (from L-85I)

| Gap | Current state |
|-----|---------------|
| Read-only env key | `READ_ONLY_DATABASE_URL` exists in operator/local context (L-85G/H) but **not** in tracked runtime code |
| Runtime proof surface | `/health`, `/ready`, `/ops/health` use owner `DATABASE_URL` via shared Prisma — `SELECT 1` liveness only |
| Identity proof | No route returns role identity, privilege matrix, or no-write proof without row export |
| Deploy target | Staging API project name **`zora-walat-api-staging`** is **INFERRED** for future env binding |

---

## 2) Design objective

Define the **minimum safe future runtime proof path** that an authorized follow-on gate can implement and prove via controlled HTTP evidence — without business data export, write probes, or secret disclosure.

**Success criteria for a future runtime proof gate (not L-85J):**

1. Prove connection uses the intended read-only role (not owner).
2. Prove selected database matches expectation (boolean flag only — no name echo in response if policy requires; see contract).
3. Prove role lacks superuser/create privileges.
4. Prove scoped audit tables grant SELECT only; INSERT/UPDATE/DELETE/TRUNCATE denied.
5. Prove no rows exported, no owner URL fallback, no secrets in response or logs.

---

## 3) Future endpoint candidate

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/ops/db-readonly-proof` |
| Mount | Express `ops.routes.js` (or slim pre-bootstrap equivalent on Vercel if separately authorized) |
| Auth | `OPS_HEALTH_TOKEN` via existing `opsInfraHealthTokenMatches` pattern (`Authorization: Bearer …` or `X-ZW-Ops-Token`) |

### Fail-closed preconditions (before any SQL)

Return **`verdict: BLOCKED`** with safe flags when any of:

| Condition | Behavior |
|-----------|----------|
| `OPS_HEALTH_TOKEN` missing from request | **401/503** per prelaunch policy — no DB connect |
| Token invalid | **401** — no DB connect |
| `READ_ONLY_DATABASE_URL` unset or empty in runtime env | **503** — `verdict: BLOCKED`, `owner_database_url_fallback_used: false` |
| Staging tier guard (recommended) | If deployment tier ≠ staging, **404** or **BLOCKED** — future gate defines exact flag |

**Never** fall back to `DATABASE_URL` or owner Prisma when read-only URL is missing.

---

## 4) Future read-only client requirement

Future implementation **must**:

| Requirement | Rationale |
|-------------|-----------|
| Instantiate a **separate** read-only DB client per request or short-lived pool | Isolation from owner singleton in `server/src/db.js` |
| Read connection string **only** from `process.env.READ_ONLY_DATABASE_URL` | Single source; no alias to owner URL |
| **Never** import or use `prisma` from `server/src/db.js` | Owner client must not participate in proof |
| **Never** use `DATABASE_URL` for this endpoint | Prevents false PASS when owner role is reachable |
| Prefer **direct non-pooled** connection if separately authorized | Reduces pooler identity ambiguity; operator gate decides |
| Redact all connection metadata in logs | No host, user, password, URL in stdout/stderr |
| Map DB errors to safe categories only | Same pattern as `classifySlimReadyDbProbeFailure` — no raw messages |
| Avoid row export | Metadata/privilege queries only (see `SAFE_SQL_SPEC.md`) |
| Avoid write probes | No INSERT/UPDATE/DELETE/TRUNCATE/DDL attempts |
| Disconnect / dispose client in `finally` | Serverless-friendly; no leaked pools |

### Client technology options (future gate chooses one — L-85J adds none)

| Option | Notes |
|--------|-------|
| Ephemeral `PrismaClient` with datasource override | Reuses existing dependency — **no new dependency** if authorized |
| Raw `pg` client | Would require new dependency — **separate authorization required** |

L-85J **does not** select or implement either option.

---

## 5) Scoped tables (privilege matrix)

From L-85D–G audit scope (six tables):

| # | Table name |
|---|------------|
| 1 | `PaymentCheckout` |
| 2 | `StripeWebhookEvent` |
| 3 | `AuditLog` |
| 4 | `FulfillmentAttempt` |
| 5 | `CanonicalTransaction` |
| 6 | `LedgerJournalEntry` |

Future proof checks **privileges only** — no `SELECT` from these tables' rows.

---

## 6) Expected identity constants (future implementation config)

Future gate may compare against **configured expected values** (env or constants — not echoed in HTTP response):

| Constant | L-85G-proven value (local probe only) | Runtime proof |
|----------|----------------------------------------|---------------|
| Expected role | `zora_walat_readonly_audit` | Must match via boolean `readonly_role_expected` |
| Expected database | `neondb` | Must match via boolean `database_expected` |

L-85J **does not** claim staging runtime uses these values — design reference only.

---

## 7) Request handling flow (design)

```
GET /ops/db-readonly-proof
  │
  ├─ OPS_HEALTH_TOKEN missing/invalid? → FAIL/BLOCKED (no DB)
  │
  ├─ READ_ONLY_DATABASE_URL missing? → BLOCKED (no DB, no owner fallback)
  │
  ├─ Open separate read-only client (READ_ONLY_DATABASE_URL only)
  │
  ├─ Run safe SQL bundle (SAFE_SQL_SPEC.md)
  │
  ├─ Aggregate boolean flags
  │
  ├─ Compute verdict: PASS | BLOCKED | FAIL
  │
  └─ Return JSON (ENDPOINT_CONTRACT.md) — disconnect client
```

---

## 8) Verdict logic (conservative)

| Verdict | When |
|---------|------|
| **BLOCKED** | Token/env/tier precondition failed; or read-only URL missing; or endpoint disabled by flag |
| **FAIL** | Connected but any required boolean flag is false (wrong role, write priv present, superuser true, etc.) |
| **PASS** | All required flags true; `secret_disclosure: false`; `no_rows_exported: true`; `owner_database_url_fallback_used: false` |

No partial PASS. No WARN tier.

---

## 9) Vercel / deploy placement (design inference)

| Target | Status |
|--------|--------|
| **`zora-walat-api-staging`** | **INFERRED** first binding for `READ_ONLY_DATABASE_URL` + endpoint deploy |
| **`zora-walat-api` (production)** | **Not authorized** for initial proof |
| Root Next.js project | **Wrong target** — no full ops route graph |

Future proof gate must capture **Vercel project name**, **deploy ID**, and **branch/commit** as structural evidence — not performed in L-85J.

---

## 10) Explicit L-85J boundaries

| Action | L-85J |
|--------|-------|
| Add runtime code | **NO** |
| Add dependency | **NO** |
| Create/call endpoint | **NO** |
| Set Vercel env | **NO** |
| Deploy | **NO** |
| Runtime proof claim | **NO** |

---

*End.*
