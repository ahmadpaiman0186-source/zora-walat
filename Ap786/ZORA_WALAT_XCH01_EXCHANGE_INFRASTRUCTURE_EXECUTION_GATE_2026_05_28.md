# XCH-01 Exchange Infrastructure Execution Gate

**Date:** 2026-05-28
**Pack ID:** XCH-01
**Status:** **GOVERNANCE / PLANNING ONLY — NOT EXECUTABLE**
**Prior pack:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) **MERGED** (strategy architecture only)

---

## 1. Purpose

XCH-01 defines the **next safe gated infrastructure planning layer** after XCH-00. It converts future remittance/exchange vision into **provider-neutral infrastructure specifications**, **invariants**, **compliance gates**, and **decision records** — without implementing money movement.

---

## 2. Scope

| In scope | Status |
|----------|--------|
| Ap786 docs/governance for infrastructure planning | **THIS PACK** |
| Provider-neutral architecture specifications | **DESIGN ONLY** |
| Quote/fee/tax engine specification (no execution) | **DESIGN ONLY** |
| Ledger/settlement invariants (no ledger execution) | **DESIGN ONLY** |
| Compliance/corridor gate matrix | **PLANNING ONLY** |
| Risk register and decision template | **PLANNING ONLY** |

---

## 3. Non-goals

| Non-goal | Status |
|----------|--------|
| Real-money exchange or remittance | **OUT OF SCOPE** |
| FX execution or live rate feeds | **OUT OF SCOPE** |
| Payout to Afghanistan or any corridor | **OUT OF SCOPE** |
| Wallet / ledger mutation in production | **OUT OF SCOPE** |
| KYC/KYB/AML/sanctions vendor integration | **OUT OF SCOPE** |
| Production remittance launch | **OUT OF SCOPE** |
| Licensing or regulatory approval claims | **FORBIDDEN** |

---

## 4. Blocked operations (default deny)

| Operation | Status |
|-----------|--------|
| Customer fund collection | **BLOCKED** |
| FX trade execution | **BLOCKED** |
| Payout release | **BLOCKED** |
| Wallet credit/debit in live systems | **BLOCKED** |
| Stripe / bank rail live integration | **BLOCKED** |
| DB schema migration for remittance | **BLOCKED** |
| Vercel deploy for remittance features | **BLOCKED** |
| Env/secret/config change | **BLOCKED** |
| Self-healing apply on money path | **GATED / NOT ENABLED** |

---

## 5. Approval gates (XCH-01 layer)

XCH-01 sits **after** XCH-00 **XCH-G0** and **before** any XCH-G7 sandbox build or XCH-G9 pilot.

| Gate | Name | XCH-01 deliverable | Default status |
|------|------|-------------------|----------------|
| **XCH1-G0** | Infrastructure gate pack filed | This pack + companions | **COMPLETE (DOCS ONLY)** |
| **XCH1-G1** | Provider-neutral architecture accepted | [Provider architecture](./ZORA_WALAT_XCH01_PROVIDER_NEUTRAL_ARCHITECTURE_2026_05_28.md) reviewed | **BLOCKED / NOT APPROVED** |
| **XCH1-G2** | Quote engine spec accepted | [Quote spec](./ZORA_WALAT_XCH01_QUOTE_RATE_FEE_TAX_ENGINE_SPEC_2026_05_28.md) reviewed | **BLOCKED / NOT APPROVED** |
| **XCH1-G3** | Ledger invariants accepted | [Ledger invariants](./ZORA_WALAT_XCH01_LEDGER_AND_SETTLEMENT_INVARIANTS_2026_05_28.md) reviewed | **BLOCKED / NOT APPROVED** |
| **XCH1-G4** | Compliance matrix accepted | [Compliance matrix](./ZORA_WALAT_XCH01_COMPLIANCE_AND_CORRIDOR_GATE_MATRIX_2026_05_28.md) reviewed | **BLOCKED / NOT APPROVED** |
| **XCH1-G5** | Decision record with sign-offs | [Decision template](./ZORA_WALAT_XCH01_DECISION_RECORD_TEMPLATE_2026_05_28.md) completed | **BLOCKED / NOT APPROVED** |

XCH-00 gates **XCH-G1…G10** remain **BLOCKED** unless separately closed.

---

## 6. Sandbox-only boundaries

| Rule | Status |
|------|--------|
| Any future prototype may use **sandbox/test credentials only** | **REQUIRED** |
| No customer real funds in sandbox without XCH-G9 | **REQUIRED** |
| Sandbox must not share production DB or ledger | **REQUIRED** |
| Sandbox output is **not** production evidence | **REQUIRED** |

---

## 7. Production NO-GO conditions

Production and real-money remittance remain **NO-GO** if **any** condition holds:

| Condition | Status |
|-----------|--------|
| XCH-00 XCH-G1…G10 not closed | **YES (current)** |
| XCH-01 XCH1-G1…G5 not approved | **YES (current)** |
| Licensing not obtained per corridor | **YES (current)** |
| Legal/compliance sign-off missing | **YES (current)** |
| KYC/AML/sanctions not integrated and tested | **YES (current)** |
| Ledger invariants not implemented and verified | **YES (current)** |
| STR-14 post-STR-12 runtime proof not executed | **YES (current program)** |

---

## 8. Companion documents

| Document | Role |
|----------|------|
| [XCH01_PROVIDER_NEUTRAL_ARCHITECTURE](./ZORA_WALAT_XCH01_PROVIDER_NEUTRAL_ARCHITECTURE_2026_05_28.md) | Provider abstractions |
| [XCH01_QUOTE_RATE_FEE_TAX_ENGINE_SPEC](./ZORA_WALAT_XCH01_QUOTE_RATE_FEE_TAX_ENGINE_SPEC_2026_05_28.md) | Quote engine spec |
| [XCH01_LEDGER_AND_SETTLEMENT_INVARIANTS](./ZORA_WALAT_XCH01_LEDGER_AND_SETTLEMENT_INVARIANTS_2026_05_28.md) | Ledger invariants |
| [XCH01_COMPLIANCE_AND_CORRIDOR_GATE_MATRIX](./ZORA_WALAT_XCH01_COMPLIANCE_AND_CORRIDOR_GATE_MATRIX_2026_05_28.md) | Compliance gates |
| [XCH01_RISK_REGISTER](./ZORA_WALAT_XCH01_RISK_REGISTER_2026_05_28.md) | Risks |
| [XCH01_DECISION_RECORD_TEMPLATE](./ZORA_WALAT_XCH01_DECISION_RECORD_TEMPLATE_2026_05_28.md) | Decision record |

---

## 9. Conservative verdict

| Item | Verdict |
|------|---------|
| XCH-01 infrastructure gate pack | **CREATED** |
| Exchange/remittance execution | **NOT ENABLED** |
| Production-ready / exchange-ready / licensed | **NOT CLAIMED** |
| Real-money / controlled pilot | **NO-GO** |

---

*XCH-01 execution gate — governance only; no money movement*
