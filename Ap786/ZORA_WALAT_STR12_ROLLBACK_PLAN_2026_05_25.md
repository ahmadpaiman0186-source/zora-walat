# STR-12 Rollback Plan

**Date:** 2026-05-25
**Status:** **LOCAL ROLLBACK PLAN FILED**

---

## 1. Rollback Scope

STR-12 changes are local code/tests/docs only. No deploy, DB migration, schema change, Stripe/Vercel action, HTTP probe, replay/resend/test event, env/config/secret change, or real database mutation was executed.

Rollback is therefore a source rollback:

- Revert `server/api/stripeWebhookAudit.mjs`.
- Revert STR-12 additions in `server/api/slimStripeWebhookHandler.mjs`.
- Revert `server/test/stripeWebhookAudit.test.js`.
- Revert STR-12 Ap786 docs/index updates.

---

## 2. Abort Criteria For Future Deployment/Proof

Abort future STR-13/STR-14 activity if:

- Audit records contain raw payloads.
- Audit records contain Stripe signature headers.
- Audit records contain webhook secrets/API keys.
- Audit records contain card/bank/customer PII.
- Audit writes affect payment/order/wallet/balance/service state.
- Invalid signatures stop returning controlled rejection.
- Duplicate event handling weakens idempotency.
- No-pay-no-service invariant is weakened.
- Any production/live/real-money endpoint is touched without separate approval.

---

## 3. Conservative Verdict

STR-12 rollback is source-only unless a future separately approved deployment occurs. No runtime rollback was required or executed.

---

*Rollback plan for local STR-12 implementation.*
