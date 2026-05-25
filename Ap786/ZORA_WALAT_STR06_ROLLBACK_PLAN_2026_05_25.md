# STR-06 Rollback Plan

**Date:** 2026-05-25
**Status:** **ROLLBACK DEFINED - NOT EXECUTED**

---

## 1. Purpose

Define the safe rollback path for STR-06 minimal webhook observability if the logs are noisy, unsafe, or regress local webhook behavior.

Rollback is code review / git change only. It does not authorize deploy, Stripe replay, Vercel API calls, DB mutation, payment/wallet/order mutation, env changes, credential rotation, or self-healing apply.

---

## 2. Rollback Scope

| File | Rollback Action |
|------|-----------------|
| `server/api/stripeWebhookObservability.mjs` | Remove helper if no longer needed |
| `server/api/slimStripeWebhookHandler.mjs` | Remove STR-06 `logStripeWebhookObservability(...)` calls and import only |
| `server/test/stripeWebhookObservability.test.js` | Remove focused STR-06 tests if helper is removed |
| `Ap786/ZORA_WALAT_STR06_*` | Add rollback evidence/update status if rollback is approved |

---

## 3. Rollback Triggers

| Trigger | Response |
|---------|----------|
| Logs include secrets, signatures, raw bodies, or PII | Stop use, rollback or patch immediately after approval |
| Webhook response behavior changes | Rollback STR-06 implementation |
| Local focused tests fail and cannot be fixed safely | Rollback STR-06 implementation |
| Vercel logs become too noisy or costly | Reduce or remove STR-06 logs after approval |
| Any payment/order/wallet side effect is suspected | Stop, investigate, and rollback if connected |

---

## 4. Verification After Rollback

| Check | Required |
|-------|----------|
| Webhook entrypoint tests | Pass focused slim webhook tests |
| Secret scan | `npm --prefix server run secrets:scan` passes |
| Diff scope | Only STR-06 observability/test/docs touched |
| Verdict | Fix remains not fully proven until staging evidence |

---

## 5. Conservative Verdict

| Item | Status |
|------|--------|
| Rollback | **DEFINED / NOT EXECUTED** |
| Deploy / redeploy | **NOT EXECUTED** |
| Stripe resend / replay / test event | **NOT EXECUTED** |
| Vercel runtime proof after STR-06 | **NOT CAPTURED YET** |
| Full processing proof | **NOT FULLY PROVEN** |
| Fix | **NOT FULLY PROVEN UNTIL STAGING RUNTIME EVIDENCE IS CAPTURED** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Rollback plan - safe reversal only, no operational action authorized*
