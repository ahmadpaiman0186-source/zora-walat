# XCH-04 Decision Record Template

**Date:** 2026-05-28
**Default status:** **NO-GO / NOT APPROVED**

---

## 1. Decision metadata

| Field | Value |
|-------|-------|
| Decision ID | _XCH04-DR-_____ |
| Decision owner | _TBD_ |
| Ledger model version | _e.g. 1.0-draft_ |
| Settlement model version | _TBD_ |
| Reconciliation model version | _TBD_ |
| Implementation approval state | **NOT APPROVED** (default) |

---

## 2. Review status

| Review | Owner | Status |
|--------|-------|--------|
| Legal / compliance review | Counsel | **NOT OBTAINED** |
| Engineering review | Eng lead | **NOT OBTAINED** |
| Finance / accounting review | Finance | **NOT OBTAINED** |
| Risk approval | Program + finance | **NOT OBTAINED** |

---

## 3. Spec acceptance checklist

| Document | Accepted? |
|----------|-----------|
| [Invariant pack](./ZORA_WALAT_XCH04_LEDGER_SETTLEMENT_RECONCILIATION_INVARIANTS_2026_05_28.md) | ☐ NO |
| [Ledger entry model](./ZORA_WALAT_XCH04_LEDGER_ENTRY_MODEL_AND_STATE_MACHINE_2026_05_28.md) | ☐ NO |
| [Zero duplicate](./ZORA_WALAT_XCH04_ZERO_DUPLICATE_TRANSACTION_INVARIANTS_2026_05_28.md) | ☐ NO |
| [Settlement lifecycle](./ZORA_WALAT_XCH04_SETTLEMENT_LIFECYCLE_AND_FINALITY_MODEL_2026_05_28.md) | ☐ NO |
| [Reconciliation](./ZORA_WALAT_XCH04_RECONCILIATION_MODEL_AND_MISMATCH_HANDLING_2026_05_28.md) | ☐ NO |
| [Reversal rules](./ZORA_WALAT_XCH04_REVERSAL_REFUND_CHARGEBACK_AND_ADJUSTMENT_RULES_2026_05_28.md) | ☐ NO |
| [Audit trail](./ZORA_WALAT_XCH04_AUDIT_TRAIL_AND_IMMUTABILITY_REQUIREMENTS_2026_05_28.md) | ☐ NO |
| [Operational controls](./ZORA_WALAT_XCH04_OPERATIONAL_CONTROLS_AND_MANUAL_REVIEW_QUEUE_2026_05_28.md) | ☐ NO |
| [Observability](./ZORA_WALAT_XCH04_OBSERVABILITY_AND_INCIDENT_RESPONSE_SPEC_2026_05_28.md) | ☐ NO |

---

## 4. Rollback boundary

| Trigger | Action |
|---------|--------|
| Spec rejected | Supersede version; no schema/migration deploy |
| Sandbox ledger aborted | Remove sandbox config only |
| Compliance objection | **Immediate NO-GO** |

Docs-only: git revert Ap786 XCH-04 files; **no production ledger impact**.

---

## 5. Launch boundary

| Item | Default |
|------|---------|
| Ledger runtime | **NOT AUTHORIZED** |
| Settlement execution | **NOT AUTHORIZED** |
| Real-money posting | **NO** |
| Launch | **NO-GO** |

---

## 6. Explicit NO-GO default

| Item | Status |
|------|--------|
| Implementation approved | **NO** |
| Settlement-ready / production-ready / licensed / compliant | **NOT CLAIMED** |

---

*XCH-04 decision template — no approval issued*
