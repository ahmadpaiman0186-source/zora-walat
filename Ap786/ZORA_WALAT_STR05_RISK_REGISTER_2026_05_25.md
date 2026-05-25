# STR-05 Risk Register

**Date:** 2026-05-25
**Status:** **OPEN - SOURCE REVIEW ONLY**

---

## 1. Risk Register

| ID | Risk | Severity | Source-Review Control | Status |
|----|------|----------|-----------------------|--------|
| STR05-R01 | Treating Stripe HTTP `200 OK` as full durable processing proof | **Critical** | Docs preserve partial/not fully proven verdict | **OPEN** |
| STR05-R02 | Claiming root cause from source review without runtime evidence | **High** | Findings use confidence and claim boundary | **OPEN** |
| STR05-R03 | Searching full `evt_...` when logs only contain redacted event ID suffix | **High** | Future plan requires suffix-aware search terms | **OPEN** |
| STR05-R04 | Wrong Vercel deployment/project/function surface searched | **High** | STR-04/STR-05 route map requires project/deployment proof | **OPEN** |
| STR05-R05 | Pino logs and console lifecycle logs visible in different sinks or contexts | **Medium** | Logger/sink distinction documented | **OPEN** |
| STR05-R06 | Adding observability changes that alter payment/order/wallet behavior | **Critical** | Minimal fix plan forbids behavior changes without separate approval | **OPEN** |
| STR05-R07 | Logging secrets, raw payloads, signatures, or customer PII | **Critical** | Redaction-only logging requirement; secrets scan required | **OPEN** |
| STR05-R08 | Deploying or triggering Stripe events while investigating | **Critical** | Strict boundary forbids deploy/replay/resend/test events | **OPEN** |
| STR05-R09 | Losing no-pay-no-service or duplicate-event protections while improving logs | **Critical** | Candidate plan explicitly preserves invariants | **OPEN** |
| STR05-R10 | Self-healing apply used to patch observability without human approval | **Critical** | Self-healing apply remains **GATED / NOT ENABLED** | **OPEN** |

---

## 2. Claim Boundary

| Claim | Status |
|-------|--------|
| Route source reviewed | **YES** |
| Logging source reviewed | **YES** |
| Root cause confirmed | **NO** |
| Vercel runtime correlation proven | **NO** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **PARTIAL / NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |

---

## 3. Risk Reduction Path

| Step | Required Evidence |
|------|-------------------|
| Read-only Vercel capture | Correct project, deployment, time window, filters, route/function view |
| Suffix-aware search | Event ID suffix plus event type, route, lifecycle, idempotency, ACK terms |
| Gated observability patch | Separate explicit approval, tests, secrets scan, static verifier |
| Staging validation | Approved sandbox proof showing route-entry, signature, lifecycle, idempotency, ACK logs |

---

*Risk register - no risk closed by source review alone*
