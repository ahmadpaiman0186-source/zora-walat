# L-84ZM — Mutation-boundary inventory

**Verdict:** `CORE10-L84ZM-VERDICT-002: LOCAL_CODE_TEST_MUTATION_BOUNDARY_PROOF_PARTIAL_UNPROVEN_MUTATION_BOUNDARIES_REMAIN_NO_RUNTIME_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

| Route / Handler | Mutation class | External side-effect risk | Required gate before side effect | Code evidence | Local test coverage | Verdict |
|-----------------|----------------|---------------------------|----------------------------------|---------------|---------------------|---------|
| `POST /webhooks/stripe` → `slimStripeWebhookHandler.mjs` | Payment/provider on verified events | Stripe money path | `Stripe-Signature` + `constructEvent` before handlers; `getHandler` not called on fail | `slimStripeWebhookHandler.mjs` L242–277 | `slimStripeWebhookEntrypoint.test.js`, `stripeWebhookAudit.test.js` | **BOUNDARY_PROVEN_BY_CODE_AND_TEST** (money path) · audit telemetry **non-zero** |
| `api/webhooks/stripe.mjs` (root bridge) | Same | Same | POST-only + delegates to slim handler | `api/webhooks/stripe.mjs` | `rootVercelWebhookBridge.test.js` (not in L-84ZM run set) | **BOUNDARY_PROVEN_BY_CODE_ONLY** on root bridge |
| `POST /api/create-checkout-session` → `slimCreateCheckoutHandler.mjs` | Stripe checkout session | Stripe API | Bearer **401** before `createCheckoutSession`; lockdown **503** first | `slimCreateCheckoutHandler.mjs` L209–255 | `l84zmLocalMutationBoundaryProof.test.js`, `slimCreateCheckoutEntrypoint.test.js` | **BOUNDARY_PROVEN_BY_CODE_AND_TEST** · **NOT_EXPOSED_ON_ROOT_STAGING** |
| `POST /api/auth/login` → `slimAuthLoginHandler.mjs` | Auth token / DB read | Auth DB | Content-type → JSON parse → Zod → owner gate → `loginUser` | `slimAuthLoginHandler.mjs` L124–204 | `l84zmLocalMutationBoundaryProof.test.js`, `slimAuthLoginEntrypoint.test.js` | **BOUNDARY_PROVEN_BY_CODE_AND_TEST** · **NOT_EXPOSED_ON_ROOT_STAGING** |
| `POST /api/auth/register` → `slimAuthRegisterHandler.mjs` | User creation | Auth DB | Content-type → JSON → validation before `registerUser` | `slimAuthRegisterHandler.mjs` L142+ | `slimAuthRegisterEntrypoint.test.js` | **BOUNDARY_PROVEN_BY_CODE_AND_TEST** · **NOT_EXPOSED_ON_ROOT_STAGING** |
| `POST /api/auth/request-otp` → `slimAuthRequestOtpHandler.mjs` | OTP/email | SMTP | Rate-limit + validation before `requestEmailOtp` mock | `slimAuthRequestOtpHandler.mjs` L163+ | `slimAuthRequestOtpEntrypoint.test.js` | **BOUNDARY_PROVEN_BY_CODE_AND_TEST** · **NOT_EXPOSED_ON_ROOT_STAGING** |
| `POST /api/ops/staging-verify-operator-email` | Email verify DB | DB/email | Bearer + validation in handler | `slimStagingOperatorVerifyEmailHandler.mjs` | Ops entrypoint tests exist; **not L-84ZM scope** | **BLOCKED_REQUIRES_RUNTIME_PROOF_LATER** / **NOT_EXPOSED_ON_ROOT_STAGING** |
| `POST /health`, `/ready` (root bridge) | None | None | Method gate **405** before handlers | `api/health-ready.mjs` | L-84ZL runtime H1–H6; local `rootHealthReadyBridge.test.js` | **BOUNDARY_PROVEN_BY_CODE_AND_TEST** (method gate) |
| Webhook live POST negative (staging) | Audit telemetry | Non-money DB audit | N/A — not probed | L-84ZL inventory | **None** | **BLOCKED_UNSAFE_TO_PROBE_DUE_NON_MONEY_AUDIT_WRITE_RISK** |

## Audit telemetry note

`recordStripeWebhookAudit` is invoked at webhook route entry and on signature failure (`slimStripeWebhookHandler.mjs` L206–211, L277). Local tests use `__zwStripeWebhookAuditAdapter` mock — **no real DB**. Production/staging POST may still write audit rows. This gate **does not** claim zero mutation on webhook rejection.

---

*End.*
