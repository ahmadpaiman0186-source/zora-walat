# CORE-07 Sandbox Mode Verification Checklist

**Date:** 2026-05-29  
**Use:** Pre-drill only — **NOT EXECUTED** in this filing

---

## Checklist (all required before drill authorization)

| ID | Check | Pass criteria | Evidence | Status |
|----|-------|---------------|----------|--------|
| SM-01 | Reloadly audience / host | Sandbox Topups API host only; **not** production audience | CORE7-EV-003, CORE7-EV-004 | **PENDING** |
| SM-02 | OAuth client | Client ID labeled sandbox / test in dashboard | CORE7-EV-003 | **PENDING** |
| SM-03 | `RELOADLY_ENV` or equivalent | Value explicitly `sandbox` (or documented test equivalent) | CORE7-EV-002 | **PENDING** |
| SM-04 | No live secret mix | Live API secret **not** loaded in drill shell | CORE7-EV-003 | **PENDING** |
| SM-05 | Stripe mode | **Test** keys only if Stripe touched; **prefer skip Stripe** | CORE7-EV-006 | **PENDING** |
| SM-06 | Deployment target | **Not** production Vercel project URL for drill | CORE7-EV-004 | **PENDING** |
| SM-07 | Database | Staging/test branch or **no-write** drill path | CORE7-EV-005 | **PENDING** |
| SM-08 | Customer MSISDN | Test/sandbox recipient only; no real customer | CORE7-EV-014 | **PENDING** |
| SM-09 | Money path | **Non-money** or sandbox ledger only | CORE7-EV-012 | **PENDING** |
| SM-10 | Operator sign-off | Checklist signed by operator + engineering witness | CORE7-EV-001 | **PENDING** |

---

## Mode ambiguity rule

If **any** of SM-01..SM-04 is **UNKNOWN** → treat as **sandbox NOT confirmed** → **do not drill**.

---

## Verification commands (reference only — do not run in CORE-07 filing)

Operator may use existing repo scripts **only after approval**, e.g. `reloadly:sandbox-readiness` — execution is **outside** this docs-only task.

---

## Conservative verdict

Sandbox mode **NOT CONFIRMED** (checklist unfilled). Drill **NOT AUTHORIZED**. Production / real-money / pilot / launch **NO-GO**.

---

*End of checklist.*
