# AFG-CARD-02 Parking And Activation Gate

**Date:** 2026-05-28
**Pack ID:** AFG-CARD-02
**Status:** **AFG-CARD TRACK PARKED / ACTIVATION REQUIRED**
**Prior packs:** [AFG-CARD-00](./ZORA_WALAT_AFG_CARD00_DOMESTIC_DIGITAL_WALLET_CARD_ARCHITECTURE_2026_05_28.md) **MERGED** · [AFG-CARD-01](./ZORA_WALAT_AFG_CARD01_BANK_SWITCH_BILLER_TELECOM_DUE_DILIGENCE_MATRIX_2026_05_28.md) **MERGED**

---

## 1. Purpose

AFG-CARD-02 **parks (freezes)** the Afghanistan domestic wallet/card track after architecture and due diligence documentation — defining explicit **activation gates** that must be satisfied before any AFG-CARD implementation may resume.

---

## 2. Why AFG-CARD is being parked

| Reason | Detail |
|--------|--------|
| Regulatory complexity | Bank, switch, biller, telecom, legal gates **not satisfied** |
| No partner approvals | Zero contracts or DD evidence filed |
| Core product priority | Zora-Walat must prove **core** mobile top-up, checkout, webhook, and order safety first |
| Roadmap discipline | Prevent premature wallet/card/bank implementation without activation criteria |
| Investor clarity | Architecture ≠ readiness; track is **intentionally frozen** |

---

## 3. Completed (AFG-CARD-00 + AFG-CARD-01)

| Pack | Deliverable | Status |
|------|-------------|--------|
| **AFG-CARD-00** | Domestic-only wallet/card/ATM/POS/bill-pay/top-up **architecture** | **MERGED / DOCS ONLY** |
| **AFG-CARD-01** | Bank / switch / biller / telecom **due diligence checklists** | **MERGED / NOT EXECUTED** |
| Risk registers + decision templates | Filed | **DOCS ONLY** |

---

## 4. What remains blocked

| Item | Status |
|------|--------|
| Runtime wallet/card code | **BLOCKED** |
| Bank / APS / AfPay integration | **BLOCKED** |
| Biller / telecom integration | **BLOCKED** |
| DD execution | **NOT STARTED** |
| Legal / compliance approval | **NOT OBTAINED** |
| Sandbox / pilot / production | **NO-GO** |

See [frozen scope register](./ZORA_WALAT_AFG_CARD02_FROZEN_SCOPE_AND_BLOCKED_OPERATIONS_REGISTER_2026_05_28.md).

---

## 5. Activation gate overview

| Gate ID | Requirement | Default |
|---------|-------------|---------|
| **AFGCARD2-ACT-G1** | All AFG-CARD-01 DD evidence captured | **BLOCKED** |
| **AFGCARD2-ACT-G2** | Legal + compliance signoff | **BLOCKED** |
| **AFGCARD2-ACT-G3** | Security / privacy signoff | **BLOCKED** |
| **AFGCARD2-ACT-G4** | Explicit stakeholder activation approval | **BLOCKED** |
| **AFGCARD2-ACT-G5** | Reentry decision recorded | **BLOCKED** |

Details: [activation criteria](./ZORA_WALAT_AFG_CARD02_FUTURE_ACTIVATION_CRITERIA_2026_05_28.md) · [reentry matrix](./ZORA_WALAT_AFG_CARD02_REENTRY_DECISION_MATRIX_2026_05_28.md).

---

## 6. Explicit return-to-core directive

**Effective immediately after AFG-CARD-02 merge:**

Engineering and program focus **returns to core Zora-Walat** — not AFG-CARD implementation.

Priority areas (see [handoff](./ZORA_WALAT_AFG_CARD02_RETURN_TO_CORE_HANDOFF_2026_05_28.md)):

- Mobile top-up
- Data packages
- International call (product boundary)
- Provider reliability
- Checkout / webhook / no-pay-no-service proof
- Fail-closed order safety
- Receipt / support / user trust
- Controlled pilot readiness (core product)

**No AFG-CARD code, integration, or pilot work** until activation gates pass.

---

## 7. Product boundary (unchanged)

- Afghanistan domestic-only when/if reactivated
- **No** cross-border remittance, foreign sender, CARD-00 cross-border, or real-money AFG-CARD claims

---

## 8. Explicit NO-GO default

| Item | Default |
|------|---------|
| AFG-CARD track status | **PARKED** |
| Implementation | **NO-GO** |
| Pilot / production | **NO-GO** |
| Activation | **NOT ISSUED** |

---

*AFG-CARD-02 — track parked until explicit activation*
