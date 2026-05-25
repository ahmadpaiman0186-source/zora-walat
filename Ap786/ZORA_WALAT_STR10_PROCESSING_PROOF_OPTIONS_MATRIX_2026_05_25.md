# STR-10 Processing Proof Options Matrix

**Date:** 2026-05-25
**Status:** **OPTIONS MATRIX FILED / NO OPTION EXECUTED**

---

## Options Matrix

| Option | Description | Evidence Value | Risk | Approval Required | STR-10 Recommendation |
|--------|-------------|----------------|------|-------------------|-----------------------|
| A | More Vercel UI log searches | May confirm whether logs are hidden by filter/time/project selection | Low operational risk, but high chance of repeating inconclusive evidence | Read-only capture approval if screenshots are needed | Useful only as a short follow-up, not sufficient alone |
| B | Controlled Stripe sandbox replay after explicit approval | Could prove real signed Stripe delivery reaches app-side flow | Higher risk: touches Stripe event delivery and may interact with app state | Explicit replay/resend approval, staging scope, stop criteria | Defer until durable audit evidence is available |
| C | Implement durable non-money webhook audit trail | Can produce deterministic route/signature/event/ACK/idempotency evidence without relying only on Vercel UI logs | Implementation and possible migration risk; must avoid money mutation side effects | Explicit implementation approval, tests, deploy approval, and later probe/replay approval | **Preferred next engineering path** |
| D | Add health/diagnostic endpoint for non-secret webhook observability | Can expose deployment/runtime readiness metadata without Stripe events | Risk of leaking operational details if not tightly scoped | Explicit implementation and security review approval | Potential supplement to Option C, not a processing proof by itself |
| E | Pause and perform full architecture audit | Broadly reduces uncertainty before further changes | Slower; may delay proof gathering | Read-only audit approval | Reasonable if decision makers want no implementation yet |

---

## Preferred Path

Option C is the preferred next engineering path because it addresses the core gap: durable evidence that the webhook handler path executed and reached a known processing decision without relying exclusively on Vercel UI log search behavior.

Option C must remain gated. STR-10 does not authorize implementation, migration, deployment, probe, Stripe replay/resend/test event, or DB/payment/wallet/order mutation.

---

## Minimum Evidence A Future Option C Should Produce

| Evidence Need | Requirement |
|---------------|-------------|
| Route entry | Non-secret route/method/timestamp evidence |
| Signature outcome | Verified/failed status without raw body, signature header, or secret |
| Event identity | Stripe event id/type after verification only |
| Processing branch | Slim path, fast ACK, Express replay, or other explicit branch |
| Idempotency decision | Created/duplicate/skipped/error decision if available |
| ACK/result | Final status, duration, and non-sensitive result |
| Safety | No card/bank/customer PII, no secrets, no raw payload |
| Staging proof | Capturable without production or live mode |

---

*Options matrix - no operational path approved by this document.*
