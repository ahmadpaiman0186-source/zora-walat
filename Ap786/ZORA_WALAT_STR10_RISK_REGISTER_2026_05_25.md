# STR-10 Risk Register

**Date:** 2026-05-25
**Status:** **OPEN GOVERNANCE RISKS**

---

## Risk Register

| ID | Risk | Severity | Control | Status |
|----|------|----------|---------|--------|
| STR10-R01 | Treating Stripe delivery resumption email as app-side processing proof | **Critical** | STR-10 states app-side processing remains unproven | **OPEN** |
| STR10-R02 | Treating invalid-signature HTTP `400` as signed Stripe event processing proof | **Critical** | STR-10 separates fail-closed route proof from processing proof | **OPEN** |
| STR10-R03 | Repeating Vercel log searches without changing evidence quality | **Medium** | Option A is not recommended as sufficient alone | **OPEN** |
| STR10-R04 | Performing Stripe replay/resend before durable audit evidence exists | **High** | Option B deferred and requires explicit approval | **OPEN** |
| STR10-R05 | Implementing audit evidence that logs secrets, raw payload, signature headers, or PII | **Critical** | Option C requires strict redaction and tests | **OPEN** |
| STR10-R06 | Adding diagnostic endpoint that leaks operational details | **High** | Option D requires security review and explicit approval | **OPEN** |
| STR10-R07 | Assuming production/live/real-money readiness from test-mode evidence | **Critical** | Production/live/real-money remain NO-GO | **OPEN** |
| STR10-R08 | Bundling implementation, deploy, and replay into one approval | **High** | STR-10 requires separate gates | **OPEN** |
| STR10-R09 | Current source and STR-07 marker expectations are not reconciled before next proof attempt | **High** | STR-10 records marker implementation absence on synced `main` as a reconciliation issue | **OPEN** |

---

## Conservative Verdict

The safest risk posture is to avoid another proof attempt until durable, non-money, staging-safe audit evidence is separately approved and implemented.

No risk in this register authorizes operational activity.

---

*Risk register - governance only.*
