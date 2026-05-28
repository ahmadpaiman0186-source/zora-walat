# XCH-04 Settlement Lifecycle And Finality Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO REAL SETTLEMENT EXECUTION**

---

## 1. Lifecycle states

| State | Meaning | Terminal |
|-------|---------|----------|
| `settlement_requested` | Internal request to settle funded transfer | NO |
| `settlement_pending` | Awaiting provider/rail response | NO |
| `settlement_provider_accepted` | Provider acknowledged; not yet final | NO |
| `settlement_completed` | Finality criteria met | **YES** |
| `settlement_failed` | Terminal failure | **YES** |
| `settlement_reversed` | Funds returned / instruction reversed | **YES** |
| `settlement_disputed` | Chargeback or dispute opened | NO (may resolve) |

---

## 2. State flow (conceptual)

```text
settlement_requested → settlement_pending → settlement_provider_accepted → settlement_completed
                              ↓                        ↓
                      settlement_failed        settlement_reversed
                              ↓
                      settlement_disputed → (manual resolution)
```

---

## 3. Finality boundary

| Criterion | Rule |
|-----------|------|
| Provider confirmation | Required evidence per [payout contract](./ZORA_WALAT_XCH02_PAYOUT_PROVIDER_CONTRACT_2026_05_28.md) |
| Irreversible window | Corridor-specific — **legal review required** |
| Internal `settlement_completed` | Only after provider finality + recon pass |

**No assumed finality** on HTTP 200 alone.

---

## 4. Operator review boundary

| Trigger | Action |
|---------|--------|
| Pending > SLA | Escalate to ops queue |
| Provider accepted but no completion | Hold + investigate |
| Dispute opened | **HOLD** all related releases |

---

## 5. Execution claim boundary

| Claim | Status |
|-------|--------|
| Settlement lifecycle specified | **YES** |
| Real settlement execution | **NOT ENABLED** |
| Settlement-ready | **NOT CLAIMED** |

---

*XCH-04 settlement lifecycle — no execution*
