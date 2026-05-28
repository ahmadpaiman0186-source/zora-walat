# XCH-00 Risk Register

**Date:** 2026-05-27
**Status:** **OPEN / DESIGN ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| XCH00-R01 | Operating without license | **Critical** | Regulatory enforcement, shutdown | XCH-G1/G2 gates; no launch until licensed | **OPEN / DESIGN ONLY** |
| XCH00-R02 | False compliance or marketing claim | **Critical** | Legal/reputational harm | Forbidden claims list; counsel review | **OPEN / DESIGN ONLY** |
| XCH00-R03 | Money laundering | **Critical** | AML penalties, program termination | AML monitoring, EDD, SAR workflow | **OPEN / DESIGN ONLY** |
| XCH00-R04 | Sanctions violation | **Critical** | Criminal/civil liability | Hard-stop screening | **OPEN / DESIGN ONLY** |
| XCH00-R05 | Terrorist financing exposure | **Critical** | Program termination | Sanctions + corridor controls | **OPEN / DESIGN ONLY** |
| XCH00-R06 | Identity fraud (sender) | **High** | Loss, AML failure | KYC/liveness/vendor controls | **OPEN / DESIGN ONLY** |
| XCH00-R07 | Receiver impersonation | **High** | Wrong-party payout | Receiver KYC + payout match | **OPEN / DESIGN ONLY** |
| XCH00-R08 | Duplicate transaction | **High** | Double payout | Idempotency at all layers | **OPEN / DESIGN ONLY** |
| XCH00-R09 | No-pay-no-service failure | **Critical** | Unpaid fulfill / customer harm | Fail-closed lifecycle | **OPEN / DESIGN ONLY** |
| XCH00-R10 | Ledger inconsistency | **Critical** | Financial loss | Double-entry invariants | **OPEN / DESIGN ONLY** |
| XCH00-R11 | Rate mismatch | **High** | Customer dispute | Rate lock + re-quote | **OPEN / DESIGN ONLY** |
| XCH00-R12 | Hidden fee/tax dispute | **High** | Regulatory action | Disclosure engine | **OPEN / DESIGN ONLY** |
| XCH00-R13 | Chargeback/refund mismatch | **High** | Loss | Reversal workflow | **OPEN / DESIGN ONLY** |
| XCH00-R14 | Settlement failure | **High** | Stuck funds | Settlement orchestration + holds | **OPEN / DESIGN ONLY** |
| XCH00-R15 | Partner payout failure | **High** | Non-delivery | Partner SLA + failover design | **OPEN / DESIGN ONLY** |
| XCH00-R16 | Liquidity shortfall | **High** | Delayed payout | Treasury controls | **OPEN / DESIGN ONLY** |
| XCH00-R17 | High-risk corridor exposure | **High** | AML/sanctions breach | Corridor-specific policies | **OPEN / DESIGN ONLY** |
| XCH00-R18 | Afghanistan payout partner risk | **High** | Operational failure | Licensed partner review (XCH-G6) | **OPEN / DESIGN ONLY** |
| XCH00-R19 | Customer support dispute overload | **Medium** | Reputation/regulatory | Escalation playbooks | **OPEN / DESIGN ONLY** |
| XCH00-R20 | Stale rate evidence | **Medium** | Wrong quote | Timestamp + lock window | **OPEN / DESIGN ONLY** |
| XCH00-R21 | Production readiness overclaim | **Critical** | False launch | Conservative verdicts; XCH gates | **OPEN / DESIGN ONLY** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All XCH00 risks | **OPEN / DESIGN ONLY** |
| Money movement enabled | **NO** |

---

*XCH-00 risk register — open until licensed execution gates close*
