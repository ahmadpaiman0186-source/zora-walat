# XCH-01 Compliance And Corridor Gate Matrix

**Date:** 2026-05-28
**Status:** **ALL GATES BLOCKED / LEGAL APPROVAL REQUIRED**

**Corridor baseline:** [XCH-00 corridor map](./ZORA_WALAT_XCH00_COUNTRY_CORRIDOR_COMPLIANCE_MAP_2026_05_27.md)

---

## 1. Corridor readiness gates

| Corridor | Licensing | Legal review | Compliance officer | Launch |
|----------|-----------|--------------|-------------------|--------|
| US → Afghanistan | **NOT OBTAINED** | **REQUIRED** | **REQUIRED** | **BLOCKED** |
| Canada → Afghanistan | **NOT OBTAINED** | **REQUIRED** | **REQUIRED** | **BLOCKED** |
| EU/EEA → Afghanistan | **NOT OBTAINED** | **REQUIRED** | **REQUIRED** | **BLOCKED** |
| UK → Afghanistan | **NOT OBTAINED** | **REQUIRED** | **REQUIRED** | **BLOCKED** |
| Arab/GCC → Afghanistan | **NOT OBTAINED** | **REQUIRED** | **REQUIRED** | **BLOCKED** |
| Turkey → Afghanistan | **NOT OBTAINED** | **REQUIRED** | **REQUIRED** | **BLOCKED** |

---

## 2. KYC/KYB gates (per send)

| Gate | Individual sender | Business sender | Receiver |
|------|-------------------|-----------------|----------|
| Identity verified | **REQUIRED** | **REQUIRED (KYB)** | **REQUIRED** |
| Risk tier assigned | **REQUIRED** | **REQUIRED** | **REQUIRED** |
| Re-verification current | **REQUIRED** | **REQUIRED** | **REQUIRED** |
| Status if gate fails | **BLOCK SEND** | **BLOCK SEND** | **BLOCK PAYOUT** |

---

## 3. AML/sanctions gates

| Gate | Trigger | Action |
|------|---------|--------|
| Sanctions screen | Every party pre-send | **HARD STOP** on match |
| PEP match | Configurable | Enhanced due diligence |
| Adverse media | High-risk tier | Manual review |
| List stale | Provider unavailable | **FAIL CLOSED** |

---

## 4. Transaction monitoring gates

| Gate | Example rule | Action |
|------|--------------|--------|
| Velocity | Daily send cap | Block or EDD |
| Structuring | Smurfing pattern | SAR workflow |
| Corridor anomaly | New device + max amount | Hold |
| First-time receiver | Large first payout | Manual review |

---

## 5. Manual review gates

| Case type | Approver role | SLA placeholder |
|-----------|---------------|-----------------|
| High-risk send | Compliance analyst | TBD |
| Sanctions false positive | Compliance officer | TBD |
| Payout name mismatch | Ops + compliance | TBD |
| Exception refund | Dual control | TBD |

---

## 6. Legal approval before launch

| Approval | Owner | Status |
|----------|-------|--------|
| Corridor legal opinion | External counsel | **NOT OBTAINED** |
| Disclosure text (fees/taxes/rights) | Legal + compliance | **NOT APPROVED** |
| Afghanistan payout partner contract | Legal | **NOT EXECUTED** |
| Privacy / data transfer (cross-border) | Legal / DPO | **NOT APPROVED** |

**No corridor launch** without written legal approval on file.

---

## 7. Conservative verdict

| Item | Status |
|------|--------|
| Compliance matrix filed | **YES** |
| Compliance achieved | **NOT CLAIMED** |
| Any corridor launch-ready | **NO** |

---

*XCH-01 compliance matrix — blocked by default*
