# STR-11 Risk Register

**Date:** 2026-05-25
**Status:** **OPEN APPROVAL RISKS**

---

## Risk Register

| ID | Risk | Severity | Control | Status |
|----|------|----------|---------|--------|
| STR11-R01 | Audit implementation accidentally changes payment/order/wallet behavior | **Critical** | Future implementation must be audit-only and covered by no-mutation tests | **OPEN** |
| STR11-R02 | Raw Stripe payload, signature, secret, or PII is stored | **Critical** | Field allowlist, denylist tests, and secrets scan required | **OPEN** |
| STR11-R03 | DB migration is bundled into implementation without approval | **High** | Separate DB migration approval required | **OPEN** |
| STR11-R04 | Deployment or proof run is bundled into implementation approval | **High** | STR-12, STR-13, and STR-14 approval phrases are separate | **OPEN** |
| STR11-R05 | Stripe replay/resend/test event occurs before durable audit is deployed | **High** | Replay/resend/test event approval separately required | **OPEN** |
| STR11-R06 | Diagnostic/audit data is treated as production readiness proof | **Critical** | Production/live/real-money/pilot remains NO-GO | **OPEN** |
| STR11-R07 | Duplicate event audit recording creates duplicate transaction side effects | **Critical** | Preserve idempotency and no-pay-no-service invariants | **OPEN** |
| STR11-R08 | Existing `AuditLog` use hides webhook audit evidence among unrelated records | **Medium** | Future design must choose queryable, typed evidence strategy | **OPEN** |
| STR11-R09 | No retention policy is defined before persistence | **Medium** | Retention and cleanup required before persistence approval | **OPEN** |

---

## Conservative Verdict

STR-11 reduces governance ambiguity but does not reduce runtime risk. All risks remain open until a future implementation is explicitly approved, tested, deployed, and validated.

---

*Risk register - no implementation authorized.*
