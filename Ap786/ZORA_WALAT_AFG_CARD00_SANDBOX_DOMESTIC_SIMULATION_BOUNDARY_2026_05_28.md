# AFG-CARD-00 Sandbox Domestic Simulation Boundary

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NOT IMPLEMENTED**

**Related:** [XCH-06](./ZORA_WALAT_XCH06_SANDBOX_ONLY_NON_MONEY_SIMULATION_BOUNDARY_2026_05_28.md) · [CARD-00 sandbox](./ZORA_WALAT_CARD00_SANDBOX_CARD_SIMULATION_BOUNDARY_2026_05_28.md)

---

## 1. Simulation label

`AFG DOMESTIC SIMULATION / NON-MONEY / NOT A REAL WALLET OR CARD`

---

## 2. Fake domestic wallet simulation

| Element | Value |
|---------|-------|
| `walletId` | `sim-afg-wallet-{uuid}` |
| Balance | Fixture AFN — in-memory only |

---

## 3. Fake card simulation

`sim-afg-card-{uuid}` — no PAN/token.

---

## 4. Fake bank partner simulation

Stubs: `approveActivation()`, `cashIn()`, `cashOut()` — log only.

---

## 5. Fake ATM / POS simulation

| Scenario | Stub result |
|----------|-------------|
| ATM withdraw | approve / decline |
| POS purchase | approve / decline |

---

## 6. Fake bill payment simulation

| Biller | Stub |
|--------|------|
| Electricity | success / timeout / fail |
| Water | success / fail |

---

## 7. Fake mobile top-up simulation

Operator fixture → success / pending / fail.

---

## 8. Fake settlement / recon scenario

Inject mismatch for `AFG-SIM-RECON-01` — ops queue exercise.

---

## 9. Boundaries

| Rule | Status |
|------|--------|
| No real card data | **REQUIRED** |
| No external APIs | **REQUIRED** |
| No real-money | **REQUIRED** |
| No cross-border sim | **REQUIRED** |

Proposed scenarios: `AFG-SIM-01` … `AFG-SIM-10` — **NOT EXECUTED**.

---

*AFG-CARD-00 sandbox — domestic sim only*
