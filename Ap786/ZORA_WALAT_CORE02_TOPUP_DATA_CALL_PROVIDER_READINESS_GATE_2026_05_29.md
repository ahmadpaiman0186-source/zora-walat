# CORE-02 Top-Up / Data / Call Provider Readiness Gate

**Date:** 2026-05-29  
**Status:** **GATE SPEC ONLY**  
**All corridors default: NOT READY**

---

## 1. Gate overview

| Corridor | Gate ID | Default | L2 sandbox | L4 pilot |
|----------|---------|---------|------------|----------|
| Mobile top-up | CORE2-GATE-TU | **CLOSED** | DR required | **NO-GO** |
| Data packages | CORE2-GATE-DP | **CLOSED** | DR required | **NO-GO** |
| International call | CORE2-GATE-IC | **CLOSED / UNRESOLVED** | **NO-GO** | **NO-GO** |

---

## 2. Mobile top-up gate (CORE2-GATE-TU)

### 2.1 Entry criteria (planning)

| # | Criterion | Status |
|---|-----------|--------|
| TU-01 | CORE2-EV-CAT-01, CORE2-EV-CAT-02 accepted | **PENDING** |
| TU-02 | Operator map governance (no placeholder IDs in prod) | **PENDING** |
| TU-03 | CORE2-EV-PAY-01, CORE2-EV-PAY-02 accepted | **PENDING** |
| TU-04 | CORE2-EV-SBX-01..03 accepted | **PENDING** |
| TU-05 | CORE-01 top-up gap report reviewed — gaps closed or accepted as residual risk | **PENDING** |

### 2.2 Exit / open sandbox (L2)

Requires **CORE02-DR** with explicit operator list and max test volume.

### 2.3 NOT READY claims

| Claim | Status |
|-------|--------|
| Top-up ready for production | **FORBIDDEN** |
| AF corridor proven | **NOT VERIFIED** |

---

## 3. Data package gate (CORE2-GATE-DP)

### 3.1 Entry criteria

| # | Criterion | Status |
|---|-----------|--------|
| DP-01 | CORE2-EV-CAT-01, CORE2-EV-CAT-03 accepted | **PENDING** |
| DP-02 | Data validity / expiry schema defined | **PENDING** |
| DP-03 | Fulfillment success = activation (not just HTTP 200) | **PENDING** |
| DP-04 | UI does not sell data without trusted catalog | **PENDING** |
| DP-05 | CORE-01 data gap report — critical gaps addressed or waived in DR | **PENDING** |

### 3.2 Default

**NOT DATA-READY** — gate **CLOSED**.

---

## 4. International call gate (CORE2-GATE-IC)

### 4.1 Boundary

| Item | Status |
|------|--------|
| Product in catalog | **UNRESOLVED** |
| Provider integration | **NOT PLANNED in CORE-02** |
| Regulatory review | **PENDING** |

### 4.2 Rule

**No** checkout, **no** provider execution, **no** marketing copy implying live international calling until CORE2-EV-CAT-04 records **IN-SCOPE** with separate program approval.

**Default: OUT OF SCOPE / NO-GO.**

---

## 5. Cross-corridor dependencies

| Dependency | Blocks |
|------------|--------|
| Stripe webhook / checkout NO-GO (program) | Any paid corridor proof |
| Provider sandbox without DR | All L2 |
| Missing no-pay-no-service evidence | L3 acceptance |

---

## 6. Audit-first checklist (before any gate opens)

| Step | Done? |
|------|-------|
| Risk register reviewed | ☐ |
| Evidence matrix IDs assigned | ☐ |
| Decision record draft **NOT APPROVED** | ☐ (default) |
| Rollback owner named | ☐ |
| Abort phrase documented in DR | ☐ |

---

## 7. NO-GO summary

| Launch type | Status |
|-------------|--------|
| Sandbox provider execution | **NO-GO** (default) |
| Controlled pilot | **NO-GO** |
| Production | **NO-GO** |
| Market launch | **NO-GO** |

---

*End of readiness gate.*
