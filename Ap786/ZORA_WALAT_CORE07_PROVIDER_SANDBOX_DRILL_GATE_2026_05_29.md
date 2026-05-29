# CORE-07 Provider Sandbox Drill Gate

**Date:** 2026-05-29  
**Status:** **APPROVAL GATE + EVIDENCE BOUNDARY FILED ONLY**  
**Extends:** [CORE-02 sandbox boundary](./ZORA_WALAT_CORE02_PROVIDER_CATALOG_RELOADLY_SANDBOX_BOUNDARY_2026_05_29.md), CORE-03..06 kernels  
**Default:** **NO-GO** — drill **NOT EXECUTED** in this pack

---

## 1. Purpose

Prepare the **operator-controlled approval gate**, safety boundary, evidence matrix, and runbook for a **future single** Reloadly/provider sandbox or non-money drill — without executing any provider call, transaction, or runtime change in this task.

---

## 2. Exact authorization phrase (mandatory)

No sandbox drill is authorized unless the operator or program lead provides **this exact phrase** (case-sensitive, full string):

```
APPROVE CORE-07 RELOADLY SANDBOX DRILL ONLY
```

| Rule | Detail |
|------|--------|
| Paraphrases | **INVALID** — e.g. “approve sandbox drill”, “CORE-07 go”, “Reloadly test OK” |
| Scope | Authorizes **one** controlled drill session only |
| Expiry | Approval valid for **one calendar day** unless re-stated in decision record |
| Recording | Must be captured in [Operator approval decision record](./ZORA_WALAT_CORE07_OPERATOR_APPROVAL_DECISION_RECORD_2026_05_29.md) as **CORE7-EV-001** |

---

## 3. Allowed future action (after approval only)

| Allowed | Forbidden |
|---------|-----------|
| **One** controlled Reloadly/provider **sandbox** or **non-money** drill | Live / production provider execution |
| Sandbox OAuth + single diagnostic dispatch (operator-run, separate session) | Real-money charge |
| Evidence capture per [evidence matrix](./ZORA_WALAT_CORE07_PROVIDER_DRILL_EVIDENCE_MATRIX_2026_05_29.md) | Customer transaction |
| Read-only logs / redacted payloads | Production API endpoint as drill target |
| Abort per [stop conditions](./ZORA_WALAT_CORE07_ABORT_ROLLBACK_AND_STOP_CONDITIONS_2026_05_29.md) | Repeated provider attempts |
| | Broad webhook replay |
| | Self-healing / auto-repair apply |

---

## 4. Pre-drill gate checklist (all must be YES before drill)

| # | Check | Evidence ID |
|---|--------|-------------|
| 1 | Sandbox / non-money mode confirmed | CORE7-EV-002 |
| 2 | Credentials are **sandbox only** (not live) | CORE7-EV-003 |
| 3 | Endpoint / provider mode documented | CORE7-EV-004 |
| 4 | No production DB write planned | CORE7-EV-005 |
| 5 | No Stripe **live** mode | CORE7-EV-006 |
| 6 | No wallet / order / payment mutation planned | CORE7-EV-007 |
| 7 | Operator approval phrase on file | CORE7-EV-001 |
| 8 | Abort criteria acknowledged | CORE7-EV-008 |
| 9 | Evidence capture plan assigned | CORE7-EV-009 |
| 10 | [Sandbox verification checklist](./ZORA_WALAT_CORE07_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_29.md) complete | CORE7-EV-002..004 |
| 11 | NPNS guardrails reviewed | [NPNS drill guardrails](./ZORA_WALAT_CORE07_NO_PAY_NO_SERVICE_DRILL_GUARDRAILS_2026_05_29.md) |
| 12 | Duplicate guardrails reviewed | [Duplicate drill guardrails](./ZORA_WALAT_CORE07_DUPLICATE_TRANSACTION_DRILL_GUARDRAILS_2026_05_29.md) |

**If any check is NO or UNKNOWN → drill status remains NOT AUTHORIZED.**

---

## 5. Pack documents

| Document | Role |
|----------|------|
| [Reloadly sandbox drill runbook](./ZORA_WALAT_CORE07_RELOADLY_SANDBOX_DRILL_RUNBOOK_2026_05_29.md) | Step-by-step (future execution) |
| [Sandbox mode verification checklist](./ZORA_WALAT_CORE07_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_29.md) | Mode / credential checks |
| [Provider drill evidence matrix](./ZORA_WALAT_CORE07_PROVIDER_DRILL_EVIDENCE_MATRIX_2026_05_29.md) | Required proof IDs |
| [NPNS drill guardrails](./ZORA_WALAT_CORE07_NO_PAY_NO_SERVICE_DRILL_GUARDRAILS_2026_05_29.md) | No delivery without proof |
| [Duplicate drill guardrails](./ZORA_WALAT_CORE07_DUPLICATE_TRANSACTION_DRILL_GUARDRAILS_2026_05_29.md) | Idempotency / retry bounds |
| [Abort / rollback / stop conditions](./ZORA_WALAT_CORE07_ABORT_ROLLBACK_AND_STOP_CONDITIONS_2026_05_29.md) | Fail-closed stops |
| [Operator approval decision record](./ZORA_WALAT_CORE07_OPERATOR_APPROVAL_DECISION_RECORD_2026_05_29.md) | DR template |
| [Conservative verdict](./ZORA_WALAT_CORE07_CONSERVATIVE_VERDICT_2026_05_29.md) | Required status table |

---

## 6. Relationship to CORE-03..06

| Track | Use in drill |
|-------|----------------|
| CORE-03 | Invariants INV-01..07 — reference only |
| CORE-04 | Post-drill snapshot scan (fixture/DB export) — **optional**, separate approval |
| CORE-05 | Idempotency key must be recorded (CORE7-EV-010) |
| CORE-06 | Delivery must not be ALLOW without payment + provider proof |

---

## 7. Conservative verdict (summary)

| Item | Status |
|------|--------|
| CORE-07 gate | **FILED ONLY** |
| Sandbox drill | **NOT EXECUTED** |
| Provider proof | **NOT VERIFIED** |
| Production / real-money / pilot / launch | **NO-GO** |

Detail: [Conservative verdict](./ZORA_WALAT_CORE07_CONSERVATIVE_VERDICT_2026_05_29.md).

---

*This pack does not modify runtime code, env, or provider configuration.*
