# CORE-00 Controlled Pilot Preconditions

**Date:** 2026-05-28
**Status:** **ALL PRECONDITIONS PENDING / PILOT NO-GO**

---

## Required evidence (none filed as CORE0-EV-*)

| ID | Precondition | Status |
|----|--------------|--------|
| CORE0-EV-CHK | Checkout happy path + decline + cancel staging proof | **PENDING** |
| CORE0-EV-WH | Webhook delivery + signature + idempotency proof | **PENDING** |
| CORE0-EV-NPNS | No-pay-no-service negative tests | **PENDING** |
| CORE0-EV-PROV | Provider catalog + availability verification | **PENDING** |
| CORE0-EV-TOPUP | Mobile top-up E2E staging | **PENDING** |
| CORE0-EV-DATA | Data package E2E staging | **PENDING** |
| CORE0-EV-CALL | International call boundary documented + reviewed | **PENDING** |
| CORE0-EV-FAIL | Fail-closed order tests (duplicate, expired, provider fail) | **PENDING** |
| CORE0-EV-SUPPORT | Support runbook + contact path | **PENDING** |
| CORE0-EV-ROLLBACK | Rollback / abort plan | **PENDING** |
| CORE0-EV-APPROVAL | Stakeholder pilot signoff | **PENDING** |

---

## Gate rule

**All CORE0-EV-* must be CAPTURED** before controlled pilot consideration.

Partial evidence → pilot **NO-GO**.

---

## Relationship to parked tracks

Controlled pilot applies to **core Zora-Walat only** — not XCH/CARD/AFG-CARD.

---

## Controlled pilot NO-GO default

| Item | Default |
|------|---------|
| Controlled pilot | **NO-GO** |
| Production launch | **NO-GO** |
| Real-money-ready | **NOT CLAIMED** |

---

*CORE-00 pilot preconditions — default NO-GO*
