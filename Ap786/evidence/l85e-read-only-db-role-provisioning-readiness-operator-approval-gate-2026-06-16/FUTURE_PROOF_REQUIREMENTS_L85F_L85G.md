# L-85E — Future proof requirements (L-85F / L-85G)

---

## L-85F — Read-only DB role provisioning (execution gate)

**Purpose:** Operator executes Neon role creation + SELECT grants per [L85F_PROVISIONING_RUNBOOK.md](./L85F_PROVISIONING_RUNBOOK.md).

### VERDICT-001 bar (provisioning filed, not role proof for staging zero-write)

| Requirement | Evidence |
|-------------|----------|
| Explicit operator approval phrase for L-85F | Attestation record |
| Role created with documented redacted name | L-85F evidence |
| SELECT on all scope tables | Neon grant log or redacted summary |
| No write grants on scope tables | Grant review |
| `READ_ONLY_DATABASE_URL` stored gitignored only | Boolean — value not in repo |
| No secret in Ap786 / git | Secret scan + review |
| No unauthorized Vercel / redeploy / POST | Attestation |

**L-85F must NOT claim:** staging identity match, staging zero-write, read-only proof for production runtime.

---

## L-85G — Read-only role privilege re-probe (verification gate)

**Purpose:** Direct SELECT-only `has_table_privilege` proof using `READ_ONLY_DATABASE_URL` after L-85F.

### VERDICT-001 bar (dedicated read-only role proven)

| Requirement | Must be true |
|-------------|--------------|
| Connect via `READ_ONLY_DATABASE_URL` only | YES |
| `current_user` is non-owner dedicated role | YES |
| SELECT true on all scope tables | YES |
| INSERT false on all scope tables | YES |
| UPDATE false on all scope tables | YES |
| DELETE false on all scope tables | YES |
| No DML/DDL executed in gate | YES |
| No secret exposed | YES |

**Suggested verdict string:**  
`CORE10-L85G-VERDICT-001: DEDICATED_READ_ONLY_DB_ROLE_DIRECTLY_PROVEN_SELECT_ONLY_…`

### VERDICT-002

Partial probe, owner connection, or write privileges still true.

---

## Staging zero-write (separate combined gate — not L-85F/L-85G alone)

Requires **all**:

1. Staging `DATABASE_URL` identity proven (L-85C-class operator attestation with redacted match), **and**
2. SELECT-only zero-row counts on **that** database in bounded window (L-85A-class), **and**
3. Read-only role proven (L-85G) if gate policy requires least-privilege connection.

**None of these are claimed by L-85E.**

---

*End.*
