# CORE-02 Provider Catalog / Reloadly Sandbox Boundary

**Date:** 2026-05-29  
**Status:** **GOVERNANCE + EVIDENCE PLAN ONLY**  
**Parent track:** CORE-01 (readiness review filed 2026-05-28)  
**Default:** **NO-GO** for production, real money, controlled pilot, provider execution, and market launch

---

## 1. Purpose

Define the **audit-first, rollback-safe** boundary for **provider catalog readiness** (mobile top-up, data packages, international call product scope) and **Reloadly sandbox** usage **before** any future runtime provider execution is authorized.

This pack **does not** authorize implementation, API calls, catalog sync, test purchases, or evidence capture that touches live provider systems.

---

## 2. Scope

| In scope | Out of scope |
|----------|----------------|
| Readiness model and evidence gates | Runtime code changes |
| Sandbox vs real provider behavior labels | Reloadly / Stripe / DB API calls |
| No-pay-no-service policy articulation | Claiming provider or production readiness |
| Evidence matrix for **future** proof | Filing runtime proof in this pack |

---

## 3. Provider catalog readiness model (planning)

### 3.1 Product corridors

| Corridor | Planning readiness level | Default |
|----------|--------------------------|---------|
| **Mobile top-up (airtime)** | L0–L4 (see §4) | **L0 — NOT READY** |
| **Data packages / bundles** | L0–L4 | **L0 — NOT READY** |
| **International call / voice** | **BOUNDARY UNRESOLVED** | **OUT OF SCOPE until DR** |

### 3.2 Readiness levels (L0–L4)

| Level | Meaning | Provider execution |
|-------|---------|-------------------|
| **L0** | Catalog / policy undefined or gaps open | **FORBIDDEN** |
| **L1** | Governance pack accepted; evidence plan filed | **FORBIDDEN** |
| **L2** | Sandbox execution **approved** via decision record; evidence IDs assigned | **SANDBOX ONLY** (operator-run, separate approval) |
| **L3** | Sandbox proof **FILED + ACCEPTED** per evidence matrix | **SANDBOX ONLY** (replay / drill) |
| **L4** | Pilot / production gates satisfied (outside CORE-02) | **NOT IN SCOPE** — default **NO-GO** |

**Current posture:** **L0** for all corridors until CORE02-DR-* records advance with filed evidence.

---

## 4. Reloadly sandbox boundary (summary)

| Category | Sandbox | Real provider |
|----------|---------|---------------|
| OAuth / API host | Sandbox Topups audience | Production Topups audience |
| Money movement | **No real subscriber balance credit** assumed | Real balance movement |
| Catalog SKUs | May differ from production | Authoritative for launch |
| Fulfillment outcome | **Simulation / test ledger** | Customer-visible delivery |
| Evidence value | Transport + workflow drill | Launch-grade proof |

Detail: [Reloadly sandbox vs real boundary](./ZORA_WALAT_CORE02_RELOADLY_SANDBOX_VS_REAL_PROVIDER_BOUNDARY_2026_05_29.md).

---

## 5. No-pay-no-service (summary)

If provider execution **fails**, **times out**, or **cannot be confirmed**:

- User must **not** be left in a state implying **delivered** service without proof.
- Payment capture must remain gated by existing money-path rules; provider failure must not trigger **delivered** or **success** UX without acceptance criteria met.

Detail: [No-pay-no-service rules](./ZORA_WALAT_CORE02_NO_PAY_NO_SERVICE_PROVIDER_FAILURE_RULES_2026_05_29.md).

---

## 6. Evidence and decision artifacts (CORE-02 pack)

| Document | Role |
|----------|------|
| [Evidence matrix](./ZORA_WALAT_CORE02_PROVIDER_CATALOG_EVIDENCE_MATRIX_2026_05_29.md) | Future proof IDs and acceptance |
| [Top-up / data / call readiness gate](./ZORA_WALAT_CORE02_TOPUP_DATA_CALL_PROVIDER_READINESS_GATE_2026_05_29.md) | Corridor gates |
| [Risk register](./ZORA_WALAT_CORE02_RISK_REGISTER_2026_05_29.md) | OPEN risks |
| [Decision record template](./ZORA_WALAT_CORE02_DECISION_RECORD_TEMPLATE_2026_05_29.md) | Default **NOT APPROVED** |

---

## 7. Audit-first execution model

| Step | Action | Rollback |
|------|--------|----------|
| 1 | File / update governance docs only (this pack) | Revert doc PR |
| 2 | Assign evidence IDs; **no** provider calls | N/A |
| 3 | Obtain CORE02-DR approval for sandbox scope | Revoke DR; mark **ABORTED** |
| 4 | Operator executes **approved** sandbox script only | Disable sandbox creds; drain queues |
| 5 | File sanitized evidence under `Ap786/evidence/` | Retract manifest row |
| 6 | Engineering review accepts evidence | Reopen gaps; **NO-GO** |
| 7 | Separate pilot / production DR (not CORE-02 alone) | Full launch rollback per IR runbooks |

**No step in this pack implies step 3–5 is authorized today.**

---

## 8. Explicit NO-GO statements

| Gate | Status |
|------|--------|
| Production deployment for provider catalog | **NO-GO** |
| Real-money checkout tied to Reloadly fulfillment | **NO-GO** |
| Controlled pilot with provider settlement | **NO-GO** |
| Provider API execution (sandbox or live) from this document | **NO-GO** |
| Market launch / public GTM claiming live top-up/data | **NO-GO** |
| “Fix proven” / “provider ready” claims | **FORBIDDEN** |

---

## 9. Claim boundary

| Allowed claim | Forbidden claim |
|---------------|-----------------|
| CORE-02 governance pack **FILED** | Provider catalog **READY** |
| Sandbox boundary **SPECIFIED** | Sandbox proof **PASSED** |
| Evidence plan **DEFINED** | Reloadly integration **PROVEN** |

---

## 10. Related documents

- CORE-01 readiness review (2026-05-28) — read-only inspection baseline  
- [CORE-00 fail-closed gate](./ZORA_WALAT_CORE00_PROVIDER_RELIABILITY_AND_FAIL_CLOSED_GATE_2026_05_28.md)  
- [Production readiness blocker register](./ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md) — CORE02 blocker row (when filed)

---

*End of CORE-02 master boundary document.*
