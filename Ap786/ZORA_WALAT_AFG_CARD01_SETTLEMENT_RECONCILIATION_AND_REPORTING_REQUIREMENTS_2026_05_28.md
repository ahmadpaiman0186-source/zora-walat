# AFG-CARD-01 Settlement, Reconciliation, And Reporting Requirements

**Date:** 2026-05-28
**Status:** **REQUIREMENTS SPEC ONLY**

**Related:** [AFG-CARD-00 ledger](./ZORA_WALAT_AFG_CARD00_DOMESTIC_LEDGER_SETTLEMENT_RECONCILIATION_BOUNDARY_2026_05_28.md)

---

## 1. Reporting domains

| Domain | Report source | Cadence |
|--------|---------------|---------|
| Bank settlement | Partner bank | Daily |
| Switch / ATM / POS | APS/AfPay / switch | Daily |
| Billers | Electricity / water / aggregator | Daily |
| Telecom / top-up | Operator / aggregator | Daily |
| Platform internal | Ledger export | Daily |

---

## 2. Transaction-level reconciliation

| Match | Rule |
|-------|------|
| Auth vs capture | 1:1 or partial capture policy |
| Bill pay vs biller ACK | Amount + ref |
| Top-up vs telecom ACK | MSISDN + amount |
| Cash-in vs bank credit | Reference match |

---

## 3. Daily settlement reconciliation

End-of-day: sum(platform) = sum(partner files) within tolerance policy — **finance approval required**.

---

## 4. Mismatch detection

| Code prefix | Severity |
|-------------|----------|
| `AFG-RECON-BANK-*` | Critical |
| `AFG-RECON-SWITCH-*` | Critical |
| `AFG-RECON-BILL-*` | High |
| `AFG-RECON-TOPUP-*` | High |

---

## 5. Exception aging

| Age | Action |
|-----|--------|
| 0–24h | Auto-queue |
| 24–72h | Ops review |
| >72h critical | Escalate — corridor/product **NO-GO** until resolved |

---

## 6. Manual review requirements

All critical mismatches require documented ops + finance decision before write-off.

---

## 7. Unresolved mismatch NO-GO

Open critical `AFG-RECON-*` → pilot and production **NO-GO** for affected product.

---

*AFG-CARD-01 settlement/recon — requirements only; not operational*
