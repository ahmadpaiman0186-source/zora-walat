# AFG-CARD-01 Pilot Readiness Gate And Evidence Requirements

**Date:** 2026-05-28
**Status:** **ALL REQUIREMENTS PENDING / PILOT NO-GO**

---

## 1. Required evidence (none filed)

| Evidence ID | Requirement | Status |
|-------------|-------------|--------|
| AFGCARD1-EV-BANK | Executed bank contract + DD signoff | **PENDING** |
| AFGCARD1-EV-SWITCH | Switch/APS/AfPay participation letter | **PENDING** |
| AFGCARD1-EV-BILLER | Biller contract(s) + test ACK | **PENDING** |
| AFGCARD1-EV-TELCO | Telecom/aggregator contract + test ACK | **PENDING** |
| AFGCARD1-EV-LEGAL | Counsel signoff memo | **PENDING** |
| AFGCARD1-EV-COMP | Compliance program approval | **PENDING** |
| AFGCARD1-EV-SANDBOX | Sandbox test report (non-money) | **PENDING** |
| AFGCARD1-EV-RECON | Reconciliation dry-run proof | **PENDING** |
| AFGCARD1-EV-SUPPORT | Support runbook + staffing plan | **PENDING** |
| AFGCARD1-EV-ROLLBACK | Rollback / abort plan signed | **PENDING** |

---

## 2. Technical sandbox evidence

Sandbox must use [AFG-CARD-00 sim boundary](./ZORA_WALAT_AFG_CARD00_SANDBOX_DOMESTIC_SIMULATION_BOUNDARY_2026_05_28.md) — **non-money**, labeled, no external prod APIs.

---

## 3. Reconciliation evidence

Daily recon dry-run with fixture files — mismatch handling demonstrated — **not executed**.

---

## 4. Rollback evidence

Documented abort: disable product flags, notify partners, no customer harm — plan only.

---

## 5. Pilot gate checklist (all unchecked)

| # | Gate | Pass? |
|---|------|-------|
| P-01 | AFGCARD1-G1 bank DD | ☐ NO |
| P-02 | AFGCARD1-G2 switch DD | ☐ NO |
| P-03 | AFGCARD1-G3 biller/telecom DD | ☐ NO |
| P-04 | AFGCARD1-G4 legal/compliance | ☐ NO |
| P-05 | All AFGCARD1-EV-* captured | ☐ NO |
| P-06 | Explicit pilot approval phrase issued | ☐ NO |

---

## 6. Pilot NO-GO default

| Item | Default |
|------|---------|
| Controlled pilot | **NO-GO** |
| Real-money pilot | **NO-GO** |
| Production | **NO-GO** |

---

*AFG-CARD-01 pilot gate — default NO-GO*
