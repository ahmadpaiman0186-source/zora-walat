# XCH-00 Super-System Intelligent Exchange Controls

**Date:** 2026-05-27
**Status:** **FUTURE DESIGN ONLY / NOT EXECUTED**

---

## 1. Purpose

Define Super-System Intelligent control patterns for a future remittance/exchange platform. Controls are **design targets** aligned with Zora-Walat safety culture (fail-closed, evidence-first, human gates).

---

## 2. Core control catalog

| Control | Future behavior | Current status |
|---------|-----------------|----------------|
| Zero duplicate transaction | Idempotency keys + dedupe at API, ledger, and partner layers | **DESIGN ONLY** |
| No pay-no-service | Funds not released until settlement preconditions met | **DESIGN ONLY** |
| Fail-closed transaction lifecycle | Illegal state transitions rejected | **DESIGN ONLY** |
| Idempotency keys | Client + server + partner correlation IDs | **DESIGN ONLY** |
| Ledger double-entry integrity | Balanced postings; invariant checks | **DESIGN ONLY** |
| Sender/receiver identity match | Payout name/ID must match verified receiver profile | **DESIGN ONLY** |
| Sanctions hard stop | Block on match; no override without compliance approval | **DESIGN ONLY** |
| AML risk escalation | Score thresholds route to EDD / hold | **DESIGN ONLY** |
| High-risk corridor review | Manual approval queue per corridor policy | **DESIGN ONLY** |
| Suspicious activity case creation | SAR workflow placeholder | **DESIGN ONLY** |
| Anomaly detection | Velocity, amount, device, corridor anomalies | **DESIGN ONLY** |
| Auto incident creation | Ops ticket on critical control breach | **DESIGN ONLY** |
| Human approval gates | High-value, high-risk, exception paths | **DESIGN ONLY** |
| Rollback-safe operation | Compensating entries; no silent delete | **DESIGN ONLY** |
| Manual payout hold | Compliance/fraud can freeze payout leg | **DESIGN ONLY** |
| Evidence-first audit history | Immutable event log + compliance export | **DESIGN ONLY** |

---

## 3. Self-healing posture

| Mode | Definition | Status |
|------|------------|--------|
| **Auto-detection** | Future design for drift, duplicate risk, ledger imbalance signals | **FUTURE DESIGN ONLY** |
| **Auto-repair** | Future gated design for safe remediation (never silent money movement) | **FUTURE GATED DESIGN ONLY** |
| **Safe failover** | Future architecture for partner/rail degradation | **FUTURE ARCHITECTURE ONLY** |
| **Self-healing apply** | Autonomous repair execution | **DISABLED** unless explicitly approved in future gate |

No production or autonomous repair claim is made by this document.

---

## 4. Control interaction model (conceptual)

```text
Quote request → eligibility + sanctions pre-check → user confirmation
     → funding capture → AML monitor → settlement orchestration
     → payout release (identity match) → reconciliation → audit close
```

Any failed control **blocks forward progress** (fail-closed).

---

## 5. Forbidden shortcuts

| Shortcut | Status |
|----------|--------|
| Skip sanctions for "small" amounts | **FORBIDDEN** |
| Release payout without identity match | **FORBIDDEN** |
| Manual DB balance patch | **FORBIDDEN** |
| Autonomous self-healing money correction | **FORBIDDEN** without gate |
| Infer PASS from architecture doc existence | **FORBIDDEN** |

---

## 6. Conservative verdict

| Item | Status |
|------|--------|
| Super-System Intelligent controls defined | **YES (design)** |
| Controls implemented | **NO** |
| Self-healing apply enabled | **NO** |
| Production-ready | **NO** |

---

*XCH-00 intelligent controls — design only*
