# CARD-00 Cross-Border Card-Linked Transfer Model

**Date:** 2026-05-28
**Status:** **ARCHITECTURE ONLY / NO REAL-MONEY TRANSFER**

**Related:** [XCH-03 quote](./ZORA_WALAT_XCH03_QUOTE_RATE_FEE_TAX_ENGINE_EXECUTION_SPEC_2026_05_28.md) · [XCH-05 corridor](./ZORA_WALAT_XCH05_CORRIDOR_READINESS_AND_JURISDICTION_GATE_MODEL_2026_05_28.md)

---

## 1. Parties

| Party | Location | Role |
|-------|----------|------|
| **Sender** | Outside Afghanistan (typical) | Funds transfer |
| **Recipient** | Afghanistan (typical) | Receives wallet/card credit |

Corridor-specific; all corridors **BLOCKED** until gates pass.

---

## 2. Sender funding boundary

| Rule | Policy |
|------|--------|
| Sender must pass KYC | **REQUIRED** (future) |
| Funding only via approved rails | Bank wire, debit, approved e-money — **not defined** |
| No unapproved crypto / informal rails | **FORBIDDEN** |
| Sanctions clear | **REQUIRED** |

---

## 3. Recipient wallet/card availability boundary

| Rule | Policy |
|------|--------|
| Recipient KYC + bank activation | **REQUIRED** |
| Card/wallet in `card_active` state | **REQUIRED** |
| Corridor enabled | **REQUIRED** — default **NO** |

---

## 4. Transfer concepts

| Type | Description | Status |
|------|-------------|--------|
| **Card-to-card** | Sender program → recipient card account | **DESIGN ONLY** |
| **Wallet-to-card** | Platform wallet → linked card balance | **DESIGN ONLY** |
| **Bank / cash-out** | Recipient withdraws at bank/agent | **DESIGN ONLY** |

All require settlement finality per [ledger boundary](./ZORA_WALAT_CARD00_LEDGER_SETTLEMENT_AND_RECONCILIATION_BOUNDARY_2026_05_28.md).

---

## 5. Settlement finality boundary

| Event | Finality |
|-------|----------|
| Sender debit confirmed | Not final until settlement bank confirms |
| Recipient credit posted | Not spendable until issuer posts |
| Cross-border FX | Separate FX leg — legal + bank |

**No assumed instant finality.**

---

## 6. Real-money claim boundary

| Claim | Status |
|-------|--------|
| Transfer model documented | **YES** |
| Real-money transfer executed | **NOT CLAIMED** |
| Remittance via card rail live | **NO-GO** |

---

*CARD-00 transfer model — no transfers enabled*
