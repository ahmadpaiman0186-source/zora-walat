# AFG-CARD-00 Domestic Digital Wallet + Card Architecture

**Date:** 2026-05-28
**Pack ID:** AFG-CARD-00
**Status:** **AFGHANISTAN DOMESTIC-ONLY / ARCHITECTURE ONLY**
**Separate tracks:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) (remittance — **OUT OF SCOPE**) · [CARD-00](./ZORA_WALAT_CARD00_DIGITAL_CARD_BANK_PARTNER_ARCHITECTURE_2026_05_28.md) (cross-border card — **OUT OF SCOPE**)

---

## 1. Purpose

AFG-CARD-00 documents a **future Afghanistan domestic-only** digital wallet and card platform — onboarding, cash-in/out, ATM/POS/online, utility bill pay, mobile top-up, compliance, and launch gates — **without** implementing runtime code or enabling any payment capability.

---

## 2. Product vision (conditional)

A future **domestic Afghanistan** platform **may** support (only with full approvals):

| Capability | Status |
|------------|--------|
| Afghan domestic digital wallet account | **NOT IMPLEMENTED** |
| Domestic bank partner activation | **NOT CONTRACTED** |
| Digital card or card-linked wallet | **NOT ISSUED** |
| Domestic cash-in (bank / approved partner) | **NOT ENABLED** |
| Domestic cash-out (bank / ATM) | **NOT ENABLED** |
| POS / online payment **inside Afghanistan** | **NOT ENABLED** |
| Utility bill payment | **NOT ENABLED** |
| Mobile top-up purchase and transfer | **NOT ENABLED** |
| Domestic wallet-to-wallet / wallet-to-bank | **NOT ENABLED** |
| KYC / AML / sanctions / fraud / limits / manual review | **SPEC ONLY** |

---

## 3. Domestic-only boundary

**AFG-DOM-01:** All users, accounts, merchants, billers, and settlement legs are **Afghanistan domestic** unless a future legal gate explicitly expands scope (not in AFG-CARD-00).

**AFG-DOM-02:** No product feature in this track may route value **across an international border**.

---

## 4. Scope

| Component | Document |
|-----------|----------|
| Bank / switch model | [Partner model](./ZORA_WALAT_AFG_CARD00_DOMESTIC_BANK_PARTNER_AND_SWITCH_MODEL_2026_05_28.md) |
| Onboarding / KYC / activation | [Onboarding](./ZORA_WALAT_AFG_CARD00_USER_ONBOARDING_KYC_AND_CARD_ACTIVATION_MODEL_2026_05_28.md) |
| Cash-in / cash-out / ATM | [Cash flows](./ZORA_WALAT_AFG_CARD00_DOMESTIC_CASH_IN_CASH_OUT_AND_ATM_FLOW_SPEC_2026_05_28.md) |
| POS / online | [POS/online](./ZORA_WALAT_AFG_CARD00_POS_AND_ONLINE_PAYMENT_FLOW_SPEC_2026_05_28.md) |
| Bill pay / top-up | [Bill/top-up](./ZORA_WALAT_AFG_CARD00_UTILITY_BILL_PAYMENT_AND_MOBILE_TOPUP_MODEL_2026_05_28.md) |
| Ledger / settlement | [Ledger](./ZORA_WALAT_AFG_CARD00_DOMESTIC_LEDGER_SETTLEMENT_RECONCILIATION_BOUNDARY_2026_05_28.md) |
| Compliance | [Compliance](./ZORA_WALAT_AFG_CARD00_COMPLIANCE_FRAUD_LIMITS_AND_MANUAL_REVIEW_MODEL_2026_05_28.md) |
| Ops / disputes | [Operations](./ZORA_WALAT_AFG_CARD00_OPERATIONAL_SUPPORT_DISPUTE_REFUND_AND_REVERSAL_MODEL_2026_05_28.md) |
| Sandbox | [Simulation](./ZORA_WALAT_AFG_CARD00_SANDBOX_DOMESTIC_SIMULATION_BOUNDARY_2026_05_28.md) |

---

## 5. Non-goals

| Non-goal | Status |
|----------|--------|
| Cross-border remittance | **EXPLICITLY EXCLUDED** |
| Foreign sender funding | **EXCLUDED** |
| International money transfer | **EXCLUDED** |
| Card-linked transfer from outside Afghanistan | **EXCLUDED** |
| Wallet balance / card issuance runtime | **OUT OF SCOPE** |
| Bill pay / top-up execution | **OUT OF SCOPE** |
| Legal advice | **FORBIDDEN CLAIM** |

---

## 6. Excluded cross-border / remittance flows

| Flow | Status |
|------|--------|
| Sender outside Afghanistan → Afghan recipient | **FORBIDDEN in AFG-CARD-00** |
| FX conversion for inbound remittance | **FORBIDDEN** |
| Integration with XCH quote/payout rails for cross-border | **FORBIDDEN without separate gate** |
| CARD-00 cross-border transfer model | **NOT IN SCOPE** — use CARD-00 track only if ever approved |

---

## 7. Regulated financial product warning

Domestic wallets and payment cards are **regulated** in Afghanistan and may implicate partner bank, central bank, and payment-system rules. AFG-CARD-00 is **architecture documentation only** — not legal advice or licensing guidance.

---

## 8. Digital wallet / card architecture (conceptual)

```text
Afghan user ──KYC──► Domestic bank partner ──► Wallet / card account (future)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    Cash-in/out           ATM/POS/online      Bill pay / top-up
    (domestic)            (domestic switch)   (domestic billers)
```

Platform: orchestration + compliance UX — **not** licensed bank unless separately obtained.

---

## 9. Bank partner dependency

| Item | Status |
|------|--------|
| Contracted Afghan bank | **NOT SIGNED** |
| Settlement accounts | **NOT OPENED** |

See [partner model](./ZORA_WALAT_AFG_CARD00_DOMESTIC_BANK_PARTNER_AND_SWITCH_MODEL_2026_05_28.md).

---

## 10. APS / AfPay / payment-switch dependency (placeholder)

| System | Role | Status |
|--------|------|--------|
| APS (placeholder) | Domestic payment switch / scheme | **NOT APPROVED** |
| AfPay (placeholder) | Domestic wallet/rail integration | **NOT APPROVED** |
| Domestic gateway | E-commerce acceptance | **NOT CONTRACTED** |

Names are **placeholders** pending legal and technical discovery — **no approval claimed**.

---

## 11. Explicit NO-GO default

| Item | Default |
|------|---------|
| Domestic wallet/card live | **NO-GO** |
| APS/AfPay/biller/telecom approved | **NOT CLAIMED** |
| Real-money / pilot / production | **NO-GO** |
| Licensed / compliant / domestic-wallet-ready | **NOT CLAIMED** |

---

*AFG-CARD-00 — Afghanistan domestic only; not remittance*
