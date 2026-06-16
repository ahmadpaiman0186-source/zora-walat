# L-85F — Read-only DB role provisioning runbook (operator-only, not executed in L-85E)

**Status:** PLAN ONLY — requires separate L-85F gate + explicit operator approval phrase.

**Prerequisite:** [OPERATOR_APPROVAL_CHECKLIST.md](./OPERATOR_APPROVAL_CHECKLIST.md) complete; L-85E filed.

---

## Objective

Create a dedicated Neon PostgreSQL login role with **SELECT-only** privilege on audit/checkout scope tables, for use in future SELECT-only verification gates (L-85G+).

## Recommended role naming

| Item | Suggestion |
|------|------------|
| Role name | `zora_audit_ro` (or operator-chosen; record redacted name in evidence) |
| Connection env var | `READ_ONLY_DATABASE_URL` in `server/.env.local` (gitignored) |
| Vercel staging binding | **Separate approved gate** — do not modify `zora-walat-api-staging` `DATABASE_URL` in L-85F unless explicitly scoped |

## Scope tables (minimum)

From `server/prisma/schema.prisma` / [L-85D SCHEMA_TABLE_SCOPE.md](../l85d-dedicated-read-only-db-role-proof-2026-06-15/SCHEMA_TABLE_SCOPE.md):

- `"PaymentCheckout"`
- `"StripeWebhookEvent"`
- `"AuditLog"`
- `"FulfillmentAttempt"`
- `"CanonicalTransaction"`
- `"LedgerJournalEntry"`

## High-level Neon steps (operator console / approved SQL session)

1. **Confirm branch** — operator confirms Neon branch matches intended audit target (see [P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md](../../P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md)).
2. **Create role** — `CREATE ROLE zora_audit_ro WITH LOGIN PASSWORD '…'` (password **never** filed in Ap786).
3. **Grant CONNECT** — on target database (e.g. `neondb`).
4. **Grant USAGE** — on `public` schema (or relevant schema).
5. **Grant SELECT** — on each scope table listed above.
6. **Verify no write grants** — no INSERT/UPDATE/DELETE/TRUNCATE on scope tables.
7. **Store connection** — `READ_ONLY_DATABASE_URL` locally only; length check OK; **no value in git**.
8. **File L-85F evidence** — role name, privilege summary, no secrets.

## What L-85F must not do

- Change application `DATABASE_URL` on Vercel without separate approval
- Run application redeploy
- Execute checkout POST probes
- Claim read-only proof until L-85G privilege probe passes

## Success criteria (L-85F filing only)

| Criterion | Required |
|-----------|----------|
| Role created | YES |
| SELECT granted on scope tables | YES |
| Write privileges absent on scope tables | YES (verified in Neon / `\dp` or `has_table_privilege` in L-85G) |
| Secret filed in Ap786 | **NO** |
| L-85G scheduled | YES |

---

*End.*
