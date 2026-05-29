# CORE-03 Self-Repair Classification Model

**Date:** 2026-05-29  
**Status:** **POLICY — AUTO-REPAIR APPLY NOT ENABLED**

---

## 1. Global rules

| Rule | Status |
|------|--------|
| Auto-repair **apply** is **NOT ENABLED** | **CONFIRMED (program policy)** |
| Money/provider mutations remain **approval-gated** | **CONFIRMED** |
| Future self-repair must run **dry-run first** | **REQUIRED** |
| Every repair needs **audit event + rollback plan + evidence** | **REQUIRED** |

Existing code (`moneyPathDriftRepair.js`, `zw-doctor` intelligence) is **not** authorization to apply repairs.

---

## 2. Classification

### Class A — Read-only detection only

| Examples | Mutation |
|----------|----------|
| FM-04 duplicate webhook detected | None |
| FM-14 sandbox/live env mismatch flag | None |
| Metrics / log counters | None |
| CORE-04 scanner output | None |

**Default for all new automation.**

### Class B — Safe metadata repair only

| Examples | Mutation |
|----------|----------|
| Backfill missing audit metadata (non-money) | Audit row only |
| Attach trace id to attempt summary | JSON metadata |
| Mark ops ticket link on order | Metadata |

**Requires:** dry-run diff, second operator ack, rollback = delete metadata row.

### Class C — Approval-required financial / provider repair

| Examples | Mutation |
|----------|----------|
| Refund when paid-not-delivered | Stripe / wallet |
| Re-submit provider POST | Provider I/O |
| Force order → FULFILLED | Order state |
| Wallet ledger adjustment | Wallet |

**Requires:** signed DR, incident id, sanitized evidence, rollback script, post-repair verification.

### Class D — Forbidden auto-repair

| Examples | Why |
|----------|-----|
| Auto-refund without human | Money loss risk |
| Auto second provider send on timeout | Duplicate top-up risk |
| Auto FULFILLED on ambiguous 200 | INV-06 violation |
| Production mock fallback enable | False delivery |
| Bypass webhook idempotency | Duplicate pay |

**Never automate.**

---

## 3. Repair workflow (mandatory)

```
Detect (A) → Recommend (report) → Dry-run (no mutation) → DR approval → Apply (C only) → Evidence → Verify → Close
```

| Step | Output |
|------|--------|
| Detect | `doctor_findings.json` (future) |
| Dry-run | `repair_plan_dry_run.md` |
| Apply | Audit: `self_repair_applied` |
| Rollback | `rollback_plan` linked in DR |
| Evidence | CORE3-EV-REPAIR-* |

---

## 4. Mapping FM → class

| FM | Default class |
|----|---------------|
| FM-01..03, FM-07..13 | A (detect); C if repair |
| FM-04, FM-05, FM-14 | A |
| FM-06, FM-09, FM-10, FM-12 | A detect; **D** auto-fix |
| FM-15 | D auto; B/C manual |

---

## 5. zw-doctor today vs future

| Mode | Class | Today |
|------|-------|-------|
| `summary`, `incidents`, `intelligence` | A | CI-static read-only |
| `moneyPathDriftRepair` apply | C/D | **NOT ENABLED** |

---

## 6. NO-GO

| Claim | Status |
|-------|--------|
| Self-healing production-safe | **NOT CLAIMED** |
| Classification **FILED** | **YES** |

---

*End of self-repair classification.*
