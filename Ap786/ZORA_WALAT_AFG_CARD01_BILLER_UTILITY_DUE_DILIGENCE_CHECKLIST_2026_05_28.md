# AFG-CARD-01 Biller / Utility Due Diligence Checklist

**Date:** 2026-05-28
**Status:** **CHECKLIST ONLY / NO BILLER APPROVAL**

**Related:** [AFG-CARD-00 bill pay](./ZORA_WALAT_AFG_CARD00_UTILITY_BILL_PAYMENT_AND_MOBILE_TOPUP_MODEL_2026_05_28.md)

---

## Checklist (all unchecked)

| # | Item | Verified? | Evidence ID |
|---|------|-----------|-------------|
| BL-01 | Electricity biller identified and contracted | ☐ NO | _pending_ |
| BL-02 | Water biller identified and contracted | ☐ NO | _pending_ |
| BL-03 | Bill inquiry API / file spec documented | ☐ NO | _pending_ |
| BL-04 | Bill payment submission model documented | ☐ NO | _pending_ |
| BL-05 | Payment confirmation / ACK model documented | ☐ NO | _pending_ |
| BL-06 | Refund / reversal policy documented | ☐ NO | _pending_ |
| BL-07 | Duplicate payment prevention agreed | ☐ NO | _pending_ |
| BL-08 | Settlement cycle and recon file documented | ☐ NO | _pending_ |
| BL-09 | Customer support escalation path documented | ☐ NO | _pending_ |
| BL-10 | Biller SLA and outage notification documented | ☐ NO | _pending_ |

---

## Model requirements (design)

| Function | Requirement |
|----------|-------------|
| Bill inquiry | Account ref validation before pay |
| Payment | Idempotency key per payment |
| Confirmation | Async ACK — pending until confirmed |
| Duplicate prevention | Same bill ref + amount dedupe |

---

## Claim boundary

| Claim | Status |
|-------|--------|
| Requirements documented | **YES** |
| Biller approved / contracted | **NOT CLAIMED** |
| Bill payment live | **NO-GO** |

---

*AFG-CARD-01 biller DD — checklist only*
