# CARD-00 Sandbox Card Simulation Boundary

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NOT IMPLEMENTED**

**Related:** [XCH-06 simulation](./ZORA_WALAT_XCH06_SANDBOX_ONLY_NON_MONEY_SIMULATION_BOUNDARY_2026_05_28.md)

---

## 1. Sandbox scope

CARD-00 sandbox extends XCH-06 principles to **fake card** flows — **no PANs, no tokens, no real issuer/processor calls, no money movement**.

Label: `CARD SIMULATION / NON-MONEY / NOT A REAL CARD`.

---

## 2. Fake card simulation

| Element | Simulation |
|---------|------------|
| `cardId` | `sim-card-{uuid}` |
| Last four | `0000` fixture only |
| Status transitions | In-memory state machine |

**No card numbers, PANs, CVV, or magnetic stripe data.**

---

## 3. Fake bank partner simulation

| Stub | Returns |
|------|---------|
| `activateRecipient()` | `approved` \| `review` \| `rejected` |
| `bankCashOut()` | Simulated receipt ref |

No HTTP to real bank APIs.

---

## 4. Fake authorization response

| Request | Stub response |
|---------|---------------|
| ATM withdraw | `approved` / `declined_insufficient_funds` |
| POS purchase | `approved` / `declined_limit` |
| Online | `approved` / `declined_fraud` |

Log-only; no network message.

---

## 5. Fake scenario matrix (proposed)

| ID | Scenario |
|----|----------|
| CARD-SIM-01 | Happy path activation |
| CARD-SIM-02 | KYC review hold |
| CARD-SIM-03 | Sanctions block |
| CARD-SIM-04 | ATM decline insufficient funds |
| CARD-SIM-05 | POS approve + settle |
| CARD-SIM-06 | Cross-border transfer credit |
| CARD-SIM-07 | Reconciliation mismatch |
| CARD-SIM-08 | Chargeback simulated |

**Not executed.**

---

## 6. Boundaries

| Rule | Status |
|------|--------|
| No real card data | **REQUIRED** |
| No external provider calls | **REQUIRED** |
| No real-money path | **REQUIRED** |
| No DB migration for card tables | **REQUIRED** |

---

*CARD-00 card sandbox — spec only; separate from XCH-06 until gate approves merge*
