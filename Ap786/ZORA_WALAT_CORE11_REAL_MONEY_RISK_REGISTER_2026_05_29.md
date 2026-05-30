# CORE-11 Real-Money Risk Register

**Date:** 2026-05-29  
**Status:** All risks **OPEN**

---

| ID | Risk | Severity | Mitigation (planned) | Status |
|----|------|----------|----------------------|--------|
| CORE11-R-01 | Duplicate transaction / double charge | Critical | CORE-05 + webhook idempotency + CORE-04 | **OPEN** |
| CORE11-R-02 | No-pay-no-service breach | Critical | CORE-06 + NPNS E2E tests | **OPEN** |
| CORE11-R-03 | Provider timeout / ambiguous status | High | Fail-closed order state; CORE-07/10 proof | **OPEN** |
| CORE11-R-04 | Payment / webhook mismatch | Critical | Stripe reconciliation + CORE-04 scanners | **OPEN** |
| CORE11-R-05 | Wallet / order inconsistency | Critical | Reconciliation proof CORE11-EV-RECON | **OPEN** |
| CORE11-R-06 | Refund / reversal error | Critical | L-11 proof; manual approval | **OPEN** |
| CORE11-R-07 | Credential / security issue | Critical | CORE11-EV-CRED checklist | **OPEN** |
| CORE11-R-08 | Provider sandbox / live confusion | Critical | CORE7/CORE11-EV-SBX-LIVE | **OPEN** |
| CORE11-R-09 | Observability blind spot | High | CORE-10 + CORE11-EV-OBS | **OPEN** |
| CORE11-R-10 | Support escalation failure | High | CORE-09 support readiness | **OPEN** |
| CORE11-R-11 | Compliance / KYC / AML gap | Critical | CORE11-EV-COMPLY | **OPEN** |
| CORE11-R-12 | Operator error (manual fulfill) | High | Runbooks + zw-doctor read-only | **OPEN** |
| CORE11-R-13 | Premature production claim | Critical | CORE-11 verdict + claim boundary | **OPEN** |
| CORE11-R-14 | Auto-repair apply in money path | Critical | CORE-08 apply disabled policy | **OPEN** |
| CORE11-R-15 | Settlement / reconciliation drift | High | [Financial boundary](./ZORA_WALAT_CORE11_FINANCIAL_CONTROL_AND_SETTLEMENT_BOUNDARY_2026_05_29.md) | **OPEN** |

---

## Conservative default

No real-money GO until **all** critical risks have **ACCEPTED** mitigations with filed evidence.

---

*End of risk register.*
