# CORE-03 Risk Register

**Date:** 2026-05-29  
**Status:** All **OPEN** unless waived in signed DR

---

## 1. Summary

| ID | Risk | Sev | Status |
|----|------|-----|--------|
| CORE3-R-01 | Invariant violation undetected until customer report | C | OPEN |
| CORE3-R-02 | Duplicate provider send on timeout | C | OPEN |
| CORE3-R-03 | Mock fallback masks Reloadly outage in prod | C | OPEN |
| CORE3-R-04 | Stale PROCESSING → false hope | H | OPEN |
| CORE3-R-05 | Webhook 404/timeout (program) → paid-not-fulfilled | H | OPEN |
| CORE3-R-06 | Self-healing apply enabled by mistake | C | OPEN |
| CORE3-R-07 | Doctor v1 mis-reads DB → wrong recommendation | H | OPEN |
| CORE3-R-08 | Data/call UI sells unsupported SKU | H | OPEN |
| CORE3-R-09 | Sandbox drill filed as prod proof | C | OPEN |
| CORE3-R-10 | Auto-repair Class C without rollback | C | OPEN |
| CORE3-R-11 | Audit gap on transition | M | OPEN |
| CORE3-R-12 | Redis shadow ack lost → duplicate work | M | OPEN |
| CORE3-R-13 | Full npm test / CI flake hides regression | M | OPEN |
| CORE3-R-14 | Operator admin retry bypasses idempotency | H | OPEN |
| CORE3-R-15 | CORE-03 docs mistaken for implementation | M | OPEN |

---

## 2. Mitigations (planning)

| ID | Mitigation | Owner | Evidence |
|----|------------|-------|----------|
| CORE3-R-01 | CORE-04 scanners + paging | Eng | CORE3-EV-DETECT |
| CORE3-R-02 | Inquiry-before-retry + FM-06 scanner | Eng | CORE3-EV-FM06 |
| CORE3-R-03 | Prod gate on mock fallback env | Ops | CORE3-EV-FM09 |
| CORE3-R-04 | FM-07 scanner + recovery caps | Eng | CORE3-EV-FM07 |
| CORE3-R-05 | STR/G-02 program closure | Ops | External |
| CORE3-R-06 | `--apply` hard deny + CI policy | Eng | CORE3-EV-REPAIR |
| CORE3-R-07 | Scanner unit tests + dry-run | Eng | CORE3-EV-DOCTOR |
| CORE3-R-08 | CORE2-GATE-DP/IC closed | Product | CORE2-EV-CAT |
| CORE3-R-09 | Sandbox labels on all evidence | Ops | CORE2-EV-SBX |
| CORE3-R-10 | Class C DR template | Program | DR |
| CORE3-R-11 | FM-13 audit completeness audit | Eng | CORE3-EV-FM13 |
| CORE3-R-12 | P2002 remains source of truth | Eng | CORE3-EV-FM04 |
| CORE3-R-13 | CI test completion gate | Eng | CI log |
| CORE3-R-14 | Admin reason min length enforced | Eng | FM-15 |
| CORE3-R-15 | README verdict banners | Docs | This pack |

---

## 3. Acceptance

| Scope | Accepted? |
|-------|-----------|
| Production launch | **NO** |
| CORE-03 kernel filed | **YES (documentation only)** |

---

*End of risk register.*
