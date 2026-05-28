# AFG-CARD-02 Reentry Decision Matrix

**Date:** 2026-05-28
**Status:** **PARKED — REENTRY NOT AUTHORIZED**

---

## 1. When AFG-CARD may be reopened

| Condition | Required |
|-----------|----------|
| All [activation criteria](./ZORA_WALAT_AFG_CARD02_FUTURE_ACTIVATION_CRITERIA_2026_05_28.md) E-01…E-10 satisfied | **YES** |
| Explicit activation approval phrase issued | **YES** |
| Reentry decision record filed | **YES** |
| Core Zora-Walat priority items not regressed | Program review |

**Today:** Reentry **NOT AUTHORIZED**.

---

## 2. Who must approve reopening

| Approver | Role |
|----------|------|
| Program owner | Activation request |
| Legal counsel | Regulatory clearance |
| Compliance officer | AML/KYC program |
| Engineering lead | Scope + safety |
| Operations lead | Support readiness |
| Finance | Settlement / recon |

All required — **no single approver sufficient**.

---

## 3. Allowed reopening scope (future, gated)

| Scope | Allowed when |
|-------|--------------|
| **Docs update only** | Always (Ap786) |
| **Sandbox simulation (non-money)** | E-09 + engineering gate |
| **Technical spike (no prod APIs)** | Sandbox gate only |
| **Pilot (real money)** | All E-* + pilot gate — default **NO-GO** |
| **Production** | All E-* + production gate — default **NO-GO** |

---

## 4. Prohibited reopening scope (always without new gate)

| Scope | Status |
|-------|--------|
| Cross-border remittance | **FORBIDDEN** |
| Foreign sender funding | **FORBIDDEN** |
| CARD-00 cross-border card | **FORBIDDEN** |
| Production wallet/card without pilot gate | **FORBIDDEN** |
| Real provider prod API keys in dev | **FORBIDDEN** |

---

## 5. Reopening modes

| Mode | Default |
|------|---------|
| Sandbox-only reopening | **NOT AUTHORIZED** |
| Pilot reopening | **NO-GO** |
| Production reopening | **NO-GO** |

---

## 6. Dependency checklist before reopening

| # | Check | Pass? |
|---|-------|-------|
| R-01 | AFGCARD02-PARKED blocker acknowledged | ☐ |
| R-02 | AFGCARD01-DUE-DILIGENCE evidence complete | ☐ NO |
| R-03 | AFGCARD00 architecture still valid | ☐ review |
| R-04 | Core product handoff priorities met (program discretion) | ☐ NO |
| R-05 | Activation decision record signed | ☐ NO |

---

*AFG-CARD-02 reentry matrix — parked*
