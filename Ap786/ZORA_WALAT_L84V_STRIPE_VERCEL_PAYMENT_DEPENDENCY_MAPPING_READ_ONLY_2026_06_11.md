# L-84V — Stripe/Vercel payment dependency mapping (read-only)

**Date:** 2026-06-11
**Branch:** `evidence/l84v-stripe-vercel-payment-dependency-mapping-read-only-2026-06-11`
**Base:** `4ab3df7` — main (L-84U merged)
**Phase:** Read-only dependency mapping — **no execution**
**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

---

## Summary

**L-84V** maps Stripe/payment dependency paths from **read-only repository and Ap786 evidence** following [L-84U](./ZORA_WALAT_L84U_STRIPE_ROTATION_ABORTED_OPERATOR_UNCERTAINTY_2026_06_11.md) abort. **No Stripe rotation, no Vercel mutation, no redeploy, no HTTP, no token generation.** Mapping is **sufficient for plan continuity**; **execution remains blocked** until separate approvals per safe replacement sequence.

## Key findings (names/paths only)

| Finding | Status |
|---------|--------|
| Server depends on **`STRIPE_SECRET_KEY`** for Stripe SDK | **YES** — `server/src/services/stripe.js`, `server/src/config/stripeEnv.js` |
| Webhook signing depends on **`STRIPE_WEBHOOK_SECRET`** | **YES** — `server/src/routes/stripeWebhook.routes.js` |
| Webhook route | **`POST /webhooks/stripe`** — `server/src/app.js` |
| Checkout routes | **`POST /create-checkout-session`**, **`POST /checkout-pricing-quote`** — `server/src/routes/payment.routes.js` |
| **`OPS_HEALTH_TOKEN`** is separate from Stripe env | **YES** — ops infra gate; L-84R/L-84S wrong-field incident |
| Staging Vercel project (Ap786) | **`zora-walat-api-staging`** |
| Production API Vercel project (Ap786) | **`zora-walat-api`** |
| Deployed live vs test key mode per project | **UNKNOWN** — not verified in L-84V |
| Whether wrong `sk_live...`-like value is deployed in **`OPS_HEALTH_TOKEN`** | **NOT PROVEN** — UI observation only (L-84R) |

## Why Stripe rotation remains unsafe without further gates

Operator could not confirm **payment/webhook/runtime blast radius** at L-84U. L-84V maps **code and name-level dependencies** but does **not** prove live deployment state, shared-key coupling, or outage window. **Separate execution approvals** still required.

## Safe future execution order (plan — not authorized here)

1. Dependency map verified (**L-84V** — this gate)
2. Secure storage confirmed (operator)
3. Stripe key rotation — **separate approval**
4. Vercel env update — **separate approval**
5. Redeploy — **separate approval**
6. L-84P authenticated HTTP — **separate approval**

## Unchanged blockers

| Item | Status |
|------|--------|
| L-84 | **NOT PROVED** |
| L-74 | **OPEN** |
| L-84P retry | **NOT AUTHORIZED** |
| Global launch | **NO-GO** |

## Evidence package

[Ap786/evidence/l84v-stripe-vercel-payment-dependency-mapping-read-only-2026-06-11/](./evidence/l84v-stripe-vercel-payment-dependency-mapping-read-only-2026-06-11/)

Prior: [L-84U](./ZORA_WALAT_L84U_STRIPE_ROTATION_ABORTED_OPERATOR_UNCERTAINTY_2026_06_11.md) · [L-84T](./ZORA_WALAT_L84T_STRIPE_LIVE_KEY_ROTATION_PLAN_ONLY_2026_06_11.md) · [L-84S](./ZORA_WALAT_L84S_STRIPE_LIKE_SECRET_EXPOSURE_TRIAGE_READ_ONLY_2026_06_10.md) · [L-84J](./ZORA_WALAT_L84J_STRIPE_KEY_ROTATION_EXECUTION_PREFLIGHT_TARGET_LOCK_2026_06_09.md)

---

*End.*
