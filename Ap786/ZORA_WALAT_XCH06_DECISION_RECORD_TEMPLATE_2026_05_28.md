# XCH-06 Decision Record Template

**Date:** 2026-05-28
**Default status:** **NO-GO / NOT APPROVED**

---

## 1. Decision metadata

| Field | Value |
|-------|-------|
| Decision ID | _XCH06-DR-_____ |
| Decision owner | _TBD_ |
| Simulation scope | _e.g. quote + fake FX only_ |
| Implementation approval state | **NOT APPROVED** (default) |

---

## 2. Provider boundaries

| List | Contents |
|------|----------|
| **Approved fake providers** | _empty — fake-fx-v1-stub, fake-payout-v1-stub (design only)_ |
| **Prohibited real providers** | **ALL** until explicit gate approval |

---

## 3. Review status

| Review | Owner | Status |
|--------|-------|--------|
| Engineering review | Eng lead | **NOT OBTAINED** |
| Compliance review (sim labeling) | Compliance | **NOT OBTAINED** |
| Legal review (sim disclaimers) | Counsel | **NOT OBTAINED** |
| Risk approval | Program | **NOT OBTAINED** |

---

## 4. Spec acceptance checklist

| Document | Accepted? |
|----------|-----------|
| [Simulation boundary](./ZORA_WALAT_XCH06_SANDBOX_ONLY_NON_MONEY_SIMULATION_BOUNDARY_2026_05_28.md) | ☐ NO |
| [Simulated quote](./ZORA_WALAT_XCH06_SIMULATED_QUOTE_AND_RATE_FLOW_SPEC_2026_05_28.md) | ☐ NO |
| [Simulated ledger](./ZORA_WALAT_XCH06_SIMULATED_LEDGER_AND_SETTLEMENT_FLOW_SPEC_2026_05_28.md) | ☐ NO |
| [Fake providers](./ZORA_WALAT_XCH06_FAKE_PROVIDER_ADAPTER_BOUNDARY_2026_05_28.md) | ☐ NO |
| [Scenario matrix](./ZORA_WALAT_XCH06_SANDBOX_TEST_SCENARIO_MATRIX_2026_05_28.md) | ☐ NO |
| [Fail-closed rules](./ZORA_WALAT_XCH06_FAIL_CLOSED_AND_NO_PAY_NO_SERVICE_RULES_2026_05_28.md) | ☐ NO |
| [Evidence plan](./ZORA_WALAT_XCH06_OBSERVABILITY_AND_EVIDENCE_CAPTURE_PLAN_2026_05_28.md) | ☐ NO |

---

## 5. Rollback boundary

| Trigger | Action |
|---------|--------|
| Spec rejected | Revert Ap786 XCH-06 docs only |
| Sandbox spike aborted | Remove sandbox config; **no prod impact** |
| Real provider detected in sim | **Immediate abort** |

---

## 6. Launch boundary

| Item | Default |
|------|---------|
| Simulation runtime authorized | **NO** |
| Real-money / pilot / production | **NO-GO** |

---

## 7. Explicit NO-GO default

| Item | Status |
|------|--------|
| Implementation approved | **NO** |
| Simulation = production proof | **FORBIDDEN** |
| Licensed / compliant / remittance-ready | **NOT CLAIMED** |

---

*XCH-06 decision template — no approval issued*
