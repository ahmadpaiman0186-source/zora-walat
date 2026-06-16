# L-85E — Operator approval checklist

**Purpose:** Operator sign-off **before** any future **L-85F** read-only DB role provisioning execution.

**L-85E does not execute provisioning.** Check all boxes in a future operator session before L-85F.

---

## A — Baseline understanding

| # | Item | Operator initial |
|---|------|------------------|
| A1 | I understand L-85D proved **no** dedicated read-only role exists today | ☐ |
| A2 | I understand staging `DATABASE_URL` identity is **NOT CLAIMED** (L-85C) | ☐ |
| A3 | I understand staging DB zero-write is **NOT CLAIMED** | ☐ |
| A4 | I understand L-85E VERDICT-001 is **readiness filing only** — not role proof | ☐ |
| A5 | Global launch / payment / provider / money / market remain **NO-GO** | ☐ |

## B — Scope lock (L-85F only if approved)

| # | Item | Operator initial |
|---|------|------------------|
| B1 | Target: Neon **read-only login role** for SELECT-only audit gates | ☐ |
| B2 | Scope tables align with [L-85D schema scope](../l85d-dedicated-read-only-db-role-proof-2026-06-15/SCHEMA_TABLE_SCOPE.md) | ☐ |
| B3 | Proposed env var name: `READ_ONLY_DATABASE_URL` (local/gitignored or separate approved gate for Vercel) | ☐ |
| B4 | **No** changes to `DATABASE_URL` owner connection in L-85F unless separately approved | ☐ |
| B5 | **No** Vercel `DATABASE_URL` identity attestation attempted in L-85F unless separate L-step | ☐ |

## C — Secret handling

| # | Item | Operator initial |
|---|------|------------------|
| C1 | I will not paste full connection strings into chat, GitHub, or Ap786 | ☐ |
| C2 | I will not run `vercel env pull` as part of L-85F unless separately approved | ☐ |
| C3 | Read-only password stored only in approved secret store (Neon / gitignored local) | ☐ |
| C4 | I will use [SECRET_HANDLING_RULES.md](./SECRET_HANDLING_RULES.md) | ☐ |

## D — Execution authorization (L-85F phrase — not active in L-85E)

| # | Item | Operator initial |
|---|------|------------------|
| D1 | Explicit approval phrase received for L-85F only (separate from L-85E) | ☐ |
| D2 | Maintenance window / rollback owner identified | ☐ |
| D3 | [ROLLBACK_ABORT_INSTRUCTIONS.md](./ROLLBACK_ABORT_INSTRUCTIONS.md) reviewed | ☐ |

## E — Post-provision proof plan

| # | Item | Operator initial |
|---|------|------------------|
| E1 | L-85G privilege re-probe planned after L-85F (SELECT-only `has_table_privilege`) | ☐ |
| E2 | No staging zero-write claim until identity + bounded SELECT counts on proven DB | ☐ |

---

## L-85E gate status

**This checklist is filed for future use.** No operator initials required to file L-85E readiness package.

---

*End.*
