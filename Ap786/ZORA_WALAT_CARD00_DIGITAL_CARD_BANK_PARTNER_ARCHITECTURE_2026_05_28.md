# CARD-00 Digital Card + Bank Partner Architecture

**Date:** 2026-05-28
**Pack ID:** CARD-00
**Status:** **FUTURE REGULATED EXPANSION / ARCHITECTURE ONLY**
**Related track:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) remittance/exchange (separate product line)

---

## 1. Purpose

CARD-00 documents a **future** regulated expansion track for digital card and card-linked wallet capabilities in Afghanistan and cross-border sender corridors — architecture, partner model, lifecycle, payment flows, compliance boundaries, and launch gates — **without** implementing any card, bank, or payment runtime.

---

## 2. Product vision (conditional)

Zora-Walat **may later** support capabilities **only if** legal, compliance, banking, issuer, processor, card-network, KYC/AML, sanctions, settlement, and operational approvals are obtained:

| Capability | Condition |
|------------|-----------|
| Sender outside Afghanistan funds wallet/card via approved rails | Legal + bank + compliance |
| Recipient in Afghanistan activates wallet/card via contracted bank | KYC + bank activation |
| Recipient uses digital card/account for online, POS, ATM, cash-out | Network + merchant acceptance |
| Sender transfers to family via compliant wallet/card/bank rails | Corridor + licensing |

**Today:** None of the above is enabled, contracted, or approved.

---

## 3. Scope

| Component | Document |
|-----------|----------|
| Bank / issuer / processor / network | [Partner model](./ZORA_WALAT_CARD00_BANK_ISSUER_PROCESSOR_NETWORK_MODEL_2026_05_28.md) |
| Card lifecycle | [Lifecycle](./ZORA_WALAT_CARD00_CARD_LIFECYCLE_AND_ACTIVATION_MODEL_2026_05_28.md) |
| Cross-border transfers | [Transfer model](./ZORA_WALAT_CARD00_CROSS_BORDER_CARD_LINKED_TRANSFER_MODEL_2026_05_28.md) |
| ATM / POS / online | [Payment flows](./ZORA_WALAT_CARD00_ATM_POS_ONLINE_PAYMENT_FLOW_SPEC_2026_05_28.md) |
| Ledger / settlement | [Ledger boundary](./ZORA_WALAT_CARD00_LEDGER_SETTLEMENT_AND_RECONCILIATION_BOUNDARY_2026_05_28.md) |
| KYC / AML / limits | [Compliance model](./ZORA_WALAT_CARD00_KYC_AML_SANCTIONS_FRAUD_AND_LIMITS_MODEL_2026_05_28.md) |
| Disputes / chargeback | [Dispute model](./ZORA_WALAT_CARD00_DISPUTE_CHARGEBACK_REFUND_AND_CARD_RISK_MODEL_2026_05_28.md) |
| Regulatory gates | [Approval gate](./ZORA_WALAT_CARD00_BANK_CONTRACT_AND_REGULATORY_APPROVAL_GATE_2026_05_28.md) |
| Sandbox simulation | [Sim boundary](./ZORA_WALAT_CARD00_SANDBOX_CARD_SIMULATION_BOUNDARY_2026_05_28.md) |

---

## 4. Non-goals

| Non-goal | Status |
|----------|--------|
| Card issuance (virtual or physical) | **OUT OF SCOPE** |
| PAN, token, card number creation | **OUT OF SCOPE** |
| Wallet balance mutation | **OUT OF SCOPE** |
| Bank / issuer / processor API integration | **OUT OF SCOPE** |
| ATM/POS/online payment enablement | **OUT OF SCOPE** |
| Legal advice | **FORBIDDEN CLAIM** |

---

## 5. Regulated financial product warning

Digital cards and card-linked wallets are **regulated financial products** in most jurisdictions. CARD-00 is **architecture documentation only**. It does **not** constitute legal advice, licensing advice, or approval to offer card services.

---

## 6. Card-linked wallet architecture (conceptual)

```text
Sender (outside AF) ──approved funding rail──► Platform ledger (future)
                                                      │
Recipient (AF) ◄──bank partner / issuer──► Card-linked wallet (future)
                                                      │
                              ATM / POS / online ◄── payment network
```

Platform role: orchestration, compliance gates, UX — **not** issuer of record unless separately licensed and contracted.

---

## 7. Bank partner dependency

| Dependency | Status |
|------------|--------|
| Contracted Afghan bank(s) | **NOT SIGNED** |
| Sponsor/issuer bank | **NOT IDENTIFIED** |
| Settlement accounts | **NOT OPENED** |

No card program without bank partner — see [partner model](./ZORA_WALAT_CARD00_BANK_ISSUER_PROCESSOR_NETWORK_MODEL_2026_05_28.md).

---

## 8. Issuer / processor / payment-network dependency

| Party | Role | Status |
|-------|------|--------|
| Issuer | BIN sponsorship, regulatory reporting | **NOT APPROVED** |
| Processor | Authorization, clearing files | **NOT CONTRACTED** |
| Payment network | Visa/Mastercard/local switch rules | **NOT APPROVED** |

---

## 9. Afghanistan recipient activation model

| Step | Gate |
|------|------|
| Recipient registers | Identity capture |
| KYC/KYB per bank policy | [Compliance model](./ZORA_WALAT_CARD00_KYC_AML_SANCTIONS_FRAUD_AND_LIMITS_MODEL_2026_05_28.md) |
| Bank activation review | Manual + automated |
| Card/wallet activated | **NOT AVAILABLE** today |

---

## 10. Sender outside Afghanistan funding model

| Step | Gate |
|------|------|
| Sender KYC | Corridor + jurisdiction |
| Approved funding method | Legal + bank rail |
| Funds credited to program ledger | Settlement + recon |
| Transfer to recipient | [Transfer model](./ZORA_WALAT_CARD00_CROSS_BORDER_CARD_LINKED_TRANSFER_MODEL_2026_05_28.md) |

**No funding rails enabled** in CARD-00 scope.

---

## 11. Explicit NO-GO default

| Item | Default |
|------|---------|
| Card program live | **NO-GO** |
| Card-ready / bank-approved / issuer-approved | **NOT CLAIMED** |
| Real-money card transactions | **NO-GO** |
| Pilot / production / licensed / compliant | **NO-GO** |

---

*CARD-00 architecture — future track only; not legal advice*
