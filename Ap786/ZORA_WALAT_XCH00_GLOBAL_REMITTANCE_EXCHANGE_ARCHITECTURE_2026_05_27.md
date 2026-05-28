# XCH-00 Global Remittance / Exchange Future Architecture

**Date:** 2026-05-27
**Pack ID:** XCH-00
**Status:** **FUTURE ARCHITECTURE ONLY / NOT EXECUTABLE / NO-GO FOR MONEY MOVEMENT**

---

## 1. Vision

Zora-Walat may one day operate a **compliance-first global remittance and transparent exchange platform** enabling verified senders in approved origin corridors to send funds to verified recipients in Afghanistan.

Approved future origin corridors (subject to licensing and legal review):

| Corridor | Destination |
|----------|-------------|
| United States | Afghanistan |
| Canada | Afghanistan |
| Europe (EU/EEA) | Afghanistan |
| United Kingdom | Afghanistan |
| Arab countries / GCC | Afghanistan |
| Turkey | Afghanistan |
| Additional corridors | Afghanistan — **only after legal/compliance approval** |

Business requirements for any future launch:

- Sender and receiver must be **identity-verified**.
- System must prevent money laundering, sanctions violations, duplicate transactions, hidden fees, rate confusion, and no-pay/no-service failures.
- In Afghanistan, recipient may receive supported currency where legally/operationally available, or **AFN** using a **transparent disclosed exchange rate**.
- Taxes, government charges, partner fees, FX spread, and app fees must be **disclosed per applicable law** — never hidden.

---

## 2. Product boundary (this filing)

| Capability | Status |
|------------|--------|
| Future architecture documentation | **ALLOWED (this pack)** |
| Money transmission | **NOT ENABLED** |
| FX execution | **NOT ENABLED** |
| Customer onboarding | **NOT ENABLED** |
| Payout operation | **NOT ENABLED** |
| KYC/KYB/AML/sanctions provider integration | **NOT ENABLED** |
| Bank/payment rail integration | **NOT ENABLED** |
| Marketing launch | **NOT AUTHORIZED** |

---

## 3. Relationship to current Zora-Walat program

| Program area | Status |
|--------------|--------|
| STR-12 webhook audit (merged) | **Separate scope** — current product evidence path |
| STR-13/STR-14 runtime proof | **PENDING / NOT EXECUTED** — current staging proof path |
| XCH-00 remittance/exchange | **FUTURE ONLY** — no code, no funds, no licenses |

XCH-00 does not modify, replace, or certify the current payment/webhook stack for remittance use.

---

## 4. Core architecture domains

| Domain | Future role | Current status |
|--------|-------------|----------------|
| **Sender identity / KYC / KYB** | Verify individuals and businesses before send | **DESIGN ONLY** |
| **Receiver identity / KYC** | Verify payout beneficiary | **DESIGN ONLY** |
| **AML / CFT risk scoring** | Risk-based monitoring and escalation | **DESIGN ONLY** |
| **Sanctions screening** | Hard stop on matched parties | **DESIGN ONLY** |
| **PEP / adverse media** | Escalation and enhanced due diligence | **DESIGN ONLY** |
| **Corridor eligibility** | Origin/destination rules engine | **DESIGN ONLY** |
| **Source-of-funds / source-of-wealth** | Enhanced review for high-risk sends | **DESIGN ONLY** |
| **Quote / rate engine** | Transparent pre-send quote | **DESIGN ONLY** |
| **Fee / tax / disclosure engine** | Rule-based legal disclosures | **DESIGN ONLY** |
| **Transaction lifecycle engine** | Fail-closed state machine | **DESIGN ONLY** |
| **Settlement orchestration** | Partner and rail settlement | **DESIGN ONLY** |
| **Afghanistan payout partner boundary** | Licensed MSP/FXD/cash payout partners | **DESIGN ONLY** |
| **Wallet / ledger architecture** | Double-entry customer funds accounting | **DESIGN ONLY** |
| **Compliance audit trail** | Immutable evidence-first history | **DESIGN ONLY** |
| **Dispute / refund / reversal workflow** | Regulated consumer rights handling | **DESIGN ONLY** |
| **Fraud / risk operations** | Case management and holds | **DESIGN ONLY** |
| **Customer support escalation** | Ops playbooks and SLA boundaries | **DESIGN ONLY** |
| **Marketing / growth readiness** | Compliance-safe GTM framework | **DESIGN ONLY** |

---

## 5. Companion documents

| Document | Focus |
|----------|-------|
| [XCH00_SUPER_SYSTEM_INTELLIGENT_EXCHANGE_CONTROLS](./ZORA_WALAT_XCH00_SUPER_SYSTEM_INTELLIGENT_EXCHANGE_CONTROLS_2026_05_27.md) | Intelligent controls and gates |
| [XCH00_KYC_KYB_AML_SANCTIONS_FRAMEWORK](./ZORA_WALAT_XCH00_KYC_KYB_AML_SANCTIONS_FRAMEWORK_2026_05_27.md) | Identity and financial crime controls |
| [XCH00_COUNTRY_CORRIDOR_COMPLIANCE_MAP](./ZORA_WALAT_XCH00_COUNTRY_CORRIDOR_COMPLIANCE_MAP_2026_05_27.md) | Corridor licensing placeholders |
| [XCH00_TRANSPARENT_QUOTE_RATE_FEE_TAX_ENGINE_DESIGN](./ZORA_WALAT_XCH00_TRANSPARENT_QUOTE_RATE_FEE_TAX_ENGINE_DESIGN_2026_05_27.md) | Quote and disclosure design |
| [XCH00_LEDGER_AND_SETTLEMENT_ARCHITECTURE](./ZORA_WALAT_XCH00_LEDGER_AND_SETTLEMENT_ARCHITECTURE_2026_05_27.md) | Ledger and settlement design |
| [XCH00_MARKETING_AND_GTM_COMPLIANCE_SAFE_FRAMEWORK](./ZORA_WALAT_XCH00_MARKETING_AND_GTM_COMPLIANCE_SAFE_FRAMEWORK_2026_05_27.md) | GTM compliance boundaries |
| [XCH00_RISK_REGISTER](./ZORA_WALAT_XCH00_RISK_REGISTER_2026_05_27.md) | Risk register |
| [XCH00_EXECUTION_GATES](./ZORA_WALAT_XCH00_EXECUTION_GATES_2026_05_27.md) | XCH-G0…G10 gates |

---

## 6. Conservative verdict

| Item | Verdict |
|------|---------|
| XCH-00 architecture pack | **CREATED** |
| Remittance/exchange functionality | **NOT IMPLEMENTED** |
| Money movement | **NO-GO** |
| Production-ready | **NO** |
| Real-money / controlled pilot | **NO-GO** |
| Regulatory / license approval | **NOT OBTAINED** |

---

*XCH-00 — future architecture only; no executable money movement*
