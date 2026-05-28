# XCH-04 Observability And Incident Response Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / MARKERS NOT DEPLOYED**

---

## 1. Observability marker families (future)

Proposed structured log prefix: `ZW_LEDGER_SETTLEMENT_OBSERVABILITY`

| Subsystem | Marker suffix examples |
|-----------|------------------------|
| Ledger | `ledger_entry_created`, `ledger_state_transition`, `ledger_imbalance_detected` |
| Settlement | `settlement_requested`, `settlement_completed`, `settlement_failed` |
| Reconciliation | `recon_matched`, `recon_exception_open`, `recon_exception_aged` |
| Duplicate detection | `duplicate_detected`, `duplicate_prevented` |

**Not implemented** in current Zora-Walat product.

---

## 2. Incident severity levels

| Level | Example | Response |
|-------|---------|----------|
| **SEV-1** | Ledger imbalance, duplicate payout | Immediate hold + exec page |
| **SEV-2** | Critical recon mismatch | Ops + finance within 1h |
| **SEV-3** | Aging recon, provider degraded | Queue review |
| **SEV-4** | Informational metric drift | Daily review |

---

## 3. Alerting expectations

| Alert | Condition |
|-------|-----------|
| IMBALANCE | Sum(debits) ≠ sum(credits) per transaction |
| DUP-PREVENT | Duplicate idempotency collision |
| RECON-CRIT | Open critical recon > 1h |
| SETTLE-STUCK | Pending settlement > corridor SLA |

Alerting infrastructure → **not deployed**.

---

## 4. Evidence capture requirements

| Incident | Minimum evidence |
|----------|------------------|
| Duplicate | Idempotency keys, both request payloads (redacted) |
| Recon mismatch | Internal + provider records side-by-side |
| Settlement failure | Provider response + ledger snapshot |
| Operator action | Approval record + before/after state |

Store under `Ap786/evidence/` when captured — **no captures filed for XCH-04**.

---

## 5. Self-healing boundary

| Item | Status |
|------|--------|
| Auto-repair ledger imbalance | **FORBIDDEN** |
| Auto-retry payout without dedupe | **FORBIDDEN** |
| Self-healing apply | **GATED / NOT ENABLED** |

Human approval required for any corrective money movement.

---

*XCH-04 observability spec — not deployed*
