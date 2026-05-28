# XCH-05 Transaction Monitoring And Risk Scoring Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Transaction monitoring purpose

Monitor remittance transactions for unusual patterns, policy violations, and escalation to manual review — **without** deploying rules engine or filing regulatory reports automatically.

---

## 2. Velocity risk placeholder

| Rule (proposed) | Example | Status |
|-----------------|---------|--------|
| Max sends per 24h | Per customer / corridor | **PLACEHOLDER** |
| Max aggregate amount per 7d | Tier-based | **PLACEHOLDER** |
| Burst detection | N sends in M minutes | **PLACEHOLDER** |

---

## 3. Amount threshold placeholder

| Threshold | Action | Status |
|-----------|--------|--------|
| Corridor daily limit | Block or review | **NOT APPROVED** |
| Single transaction cap | Block or review | **NOT APPROVED** |
| Cumulative lifetime cap | Enhanced KYC trigger | **PLACEHOLDER** |

---

## 4. Corridor risk placeholder

| Factor | Effect |
|--------|--------|
| High-risk receive jurisdiction | Elevated score |
| New corridor (< 90d) | Enhanced monitoring |
| Provider degradation | **HOLD** new transactions |

---

## 5. Customer risk tier placeholder

| Tier | Monitoring intensity |
|------|---------------------|
| Low | Standard rules |
| Medium | Tighter velocity |
| High | All transactions manual review candidate |

Links to [KYC risk tier](./ZORA_WALAT_XCH05_KYC_KYB_IDENTITY_VERIFICATION_GATE_MODEL_2026_05_28.md).

---

## 6. Unusual activity review queue

| Trigger | Queue ID |
|---------|----------|
| TM rule hit | `TM-UA-*` |
| Structuring pattern (proposed) | `TM-STRUCT-*` |
| Beneficiary mismatch | `TM-BEN-*` |

All items → **HOLD** until ops/compliance decision.

---

## 7. Alerting expectations

| Alert | Channel (future) | Status |
|-------|------------------|--------|
| Critical TM hit | On-call + compliance | **NOT DEPLOYED** |
| Aging review item | Ops queue SLA | **NOT DEPLOYED** |

---

## 8. SAR / legal filing boundary

| Item | Status |
|------|--------|
| TM rules specified | **YES (PLACEHOLDER)** |
| Automated SAR filing | **FORBIDDEN** |
| Legal filing automation | **NOT IMPLEMENTED** |
| Compliance officer workflow | **NOT DEFINED** in product |

Regulatory reporting requires **human compliance officer** — never automated in spec without explicit legal gate.

---

*XCH-05 transaction monitoring — placeholder only*
