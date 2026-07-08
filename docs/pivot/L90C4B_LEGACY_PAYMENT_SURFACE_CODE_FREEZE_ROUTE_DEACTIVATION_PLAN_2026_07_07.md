# L-90C4B Legacy Payment Surface Code Freeze / Route Deactivation Plan — 2026-07-07

## Engineering standard preserved

**ZORA GLOBAL REAL-PROOF SUPER-SYSTEM ENGINEERING STANDARD**  
**FAMILY-INCOME PRODUCTION BUSINESS STANDARD**  
**ZERO-FALSE-CLAIM / ZERO-DUPLICATE-TRANSACTION / NO-PAY-NO-SERVICE / SAFE-FAILOVER / AUDITABLE-REVENUE STANDARD**

NO GLOBAL LAUNCH, NO AFGHANISTAN MARKET CLAIM, NO MONEY CLAIM, NO CARD CLAIM, NO WALLET CLAIM, NO PROVIDER CLAIM, NO BANK CLAIM, NO COMPLIANCE CLAIM, NO FAMILY-INCOME CLAIM, NO INVESTOR CLAIM WITHOUT DIRECT LEGAL, TECHNICAL, OPERATIONAL, FINANCIAL, PROVIDER, CUSTOMER, AND REAL-WORLD PROOF.

**Branch context:** `gate/l90c4b-legacy-payment-surface-code-freeze-route-deactivation-plan-2026-07-07` (planning)  
**Mode:** DOCS ONLY — plan only; **no code changed in this gate**

---

## 1. Purpose

This document is a **docs-only route freeze and route deactivation plan** for legacy **Zora-Walat** payment surfaces, following **L-90C4A** (Stripe dashboard, key rotation, Vercel env cleanup, GitHub secrets cleanup, bank freeze evidence lock).

| Statement | Status |
|-----------|--------|
| Code changed in this gate | **NO** |
| Payment shutdown implemented | **NOT CLAIMED** |
| Real-money readiness | **NOT CLAIMED** |
| Launch readiness | **NOT CLAIMED** |
| Implementation authorized | **NO-GO** |

**Objective:** Define **what must be inventoried**, **what must stay frozen**, and **how future deactivation may proceed** — without executing any repository or runtime changes in L-90C4B.

---

## 2. Cross-reference gates

| Gate | Document | Relevance |
|------|----------|-----------|
| **L-90C1A1** | `docs/pivot/L90C1A1_OFFICIAL_NAME_CLEARANCE_READONLY_2026_07_07.md` | Brand names unproven; no public rebrand |
| **L-90C2A** | `docs/pivot/L90C2A_ZORA_CARD_LEGAL_PRICING_CONCEPT_LOCK_2026_07_07.md` | Zora Card prepaid concept only; no wallet/card activation |
| **L-90C3A** | `docs/pivot/L90C3A_ZORA_AF_BRAND_ARCHITECTURE_DECISION_2026_07_07.md` | Zora AF public brand candidate; Zora-Walat legacy frozen |
| **L-90C4A** | `docs/pivot/L90C4A_LEGACY_STRIPE_SHUTDOWN_EVIDENCE_LOCK_2026_07_07.md` | Runtime/env/key surface reduced; bank frozen; payment reactivation NO-GO |

**Inherited context:** Legacy Stripe repo read-only audit (2026-07-07) confirmed substantial in-repo payment paths remain **production-shaped** even after L-90C4A env/key cleanup. L-90C4B addresses **code/route surface** planning only.

---

## 3. Legacy payment surface inventory plan

Future implementation gates must produce a **read-only inventory** (L-90C4C) covering these categories:

| # | Category | Planning scope |
|---|----------|----------------|
| 1 | **Stripe SDK / service references** | `server/src/services/stripe.js`, `import Stripe from 'stripe'`, orchestration wrappers |
| 2 | **Checkout session creation routes** | `paymentController.js`, `payment.routes.js`, `slimCreateCheckoutHandler.mjs`, `api/create-checkout-session.mjs` |
| 3 | **Webhook routes and handlers** | `slimStripeWebhookHandler.mjs`, `stripeWebhook.routes.js`, `server/api/index.mjs` fast paths |
| 4 | **Payment intent / checkout completion handlers** | `phase1StripeCheckoutSessionCompleted.js`, `webtopupWebhookHandlers.js`, `stripeWebhook.routes.js` event branches |
| 5 | **Refund / dispute incident handlers** | `phase1StripeChargeIncidents.js`, `slimStripeWebhookChargeRefunded.mjs`, `charge.refunded` / `charge.dispute.created` |
| 6 | **Top-up money path references** | Web top-up routes, `webtopupMoneyPathReconciliationEngine.js`, wallet/top-up API paths |
| 7 | **Ledger / fulfillment coupling** | `ledgerService.js`, fulfillment queue triggers post-webhook, `PaymentCheckout` state machine |
| 8 | **Frontend checkout UI** | `components/topup/StripeCheckoutElements.tsx`, `ZoraWalatTopUp.tsx`, checkout return flows |
| 9 | **Flutter / mobile payment key references** | `lib/stripe_keys.dart`, checkout screens, `--dart-define=STRIPE_PUBLISHABLE_KEY` docs |
| 10 | **Vercel rewrites / routing surfaces** | Root `vercel.json` (`/webhooks/stripe`, `/create-checkout-session`), server `vercel.json` |
| 11 | **Env variable dependencies** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, live-proof flags, pricing fee env |
| 12 | **CI / test fixtures and synthetic Stripe references** | `.github/workflows/ci.yml` synthetic keys, integration tests, `secrets:scan` patterns |

**Inventory rule:** File paths and route maps only — **no secret values**, no live API calls, no customer data.

---

## 4. Known legacy Stripe surface categories (planning summary)

From prior repo audit — **planning level only**; L-90C4C must re-verify:

| Surface | Known presence (planning) |
|---------|---------------------------|
| Server-side checkout creation | **YES** — `checkout.sessions.create` in payment controller |
| Stripe webhook handling | **YES** — slim + full Express paths; `POST /webhooks/stripe` |
| `charge.refunded` handling | **YES** — incident recording |
| `charge.dispute.created` handling | **YES** — incident recording |
| Frontend checkout components | **YES** — Next.js top-up UI + Stripe Elements |
| Mobile / Flutter Stripe key references | **YES** — `lib/stripe_keys.dart`, checkout screens |
| Vercel webhook / checkout routing | **YES** — root `vercel.json` rewrites |
| Test fixtures / synthetic Stripe keys | **YES** — CI + integration tests (non-production placeholders) |

**Not observed in production `server/src/` (planning):** Stripe products/prices API, payment links product, subscriptions product — Dashboard may still hold legacy objects (L-90C4A: none observed).

---

## 5. Freeze policy (effective immediately for operators; code unchanged)

Until route deactivation implementation gates pass:

| Rule | Lock |
|------|------|
| No new Stripe env variables in Vercel / GitHub | **LOCKED** |
| No new Stripe keys copied into Vercel | **LOCKED** |
| No GitHub Stripe secrets or variables | **LOCKED** |
| No new webhook endpoint in Stripe Dashboard | **LOCKED** |
| No new payment link | **LOCKED** |
| No new product / price / subscription | **LOCKED** |
| No checkout route reactivation | **LOCKED** |
| No Zora AF payment implementation through legacy Stripe | **LOCKED** |
| No payment reactivation | **LOCKED** (L-90C4A) |
| Legacy Zora-Walat code may be read/reused for patterns only | Per pivot freeze — **no money-path extension** |

**Note:** Freeze policy is **operational + planning**. In-repo routes remain callable **if** secrets were reintroduced — future deactivation gates must **fail-closed in code**.

---

## 6. Future route deactivation strategy (plan only — no implementation)

Proposed approaches for **L-90C4D+** implementation gates (subject to design review):

| Strategy | Description |
|----------|-------------|
| **Hard fail-closed** | Legacy checkout and webhook handlers return explicit error without Stripe SDK calls when `PAYMENT_DISABLED=true` (or equivalent) |
| **410 Gone / controlled 503** | Disabled payment endpoints return stable, auditable HTTP status — not ambiguous 500s |
| **Explicit flag before code change** | `PAYMENT_DISABLED` / `LEGACY_STRIPE_DISABLED` env or feature flag — default **true** for deactivation deploy |
| **Route-level audit log** | Blocked legacy payment attempts log structured event (no PII, no secrets) |
| **No-pay-no-service preserved** | Fulfillment queue must not dispatch from disabled payment path |
| **No duplicate transaction preserved** | Idempotency keys and webhook dedup remain intact if webhook path is retained read-only |
| **No fulfillment from disabled path** | `ensureQueuedFulfillmentAttempt` must not run on blocked checkout completion |
| **Webhook endpoint plan** | Option A: handler returns 410/503 without processing; Option B: remove Vercel rewrite after handler proof — **separate gate** |
| **Deprecation comments** | Future implementation gate only — no drive-by refactors in planning phase |

**Ordering principle:** Tests-only fail-closed proof (**L-90C4E**) before production code change (**L-90C4F**).

---

## 7. Required implementation gates before any code change

| Gate | Purpose | Mode |
|------|---------|------|
| **L-90C4C** | Legacy payment route inventory proof | Read-only |
| **L-90C4D** | Route deactivation design review | Plan-only |
| **L-90C4E** | Tests-only fail-closed proof | Test/code gate — scoped |
| **L-90C4F** | Code implementation gate | Operator-approved |
| **L-90C4G** | Post-implementation audit | Read-only proof |
| **L-90C4H** | Deployment / env verification | Operator + staging proof |

**Hard rule:** L-90C4B does **not** authorize L-90C4E–H. Each gate requires separate operator sign-off.

---

## 8. Safety requirements (mandatory for all future deactivation work)

| Requirement | Lock |
|-------------|------|
| Zero secret printing in logs, docs, or chat | **MANDATORY** |
| No live Stripe API calls in proof scripts unless dedicated controlled gate | **MANDATORY** |
| Fail-closed by default | **MANDATORY** |
| Customer-visible payment flows disabled | **MANDATORY** |
| Fulfillment cannot run without confirmed payment | **MANDATORY** (no-pay-no-service) |
| No accidental live checkout | **MANDATORY** |
| No hidden payment path (shadow routes, dev bypass without gate) | **MANDATORY** |
| All changes auditable (PR, gate doc, test proof) | **MANDATORY** |
| Ap786 evidence chain preserved | **MANDATORY** — do not delete L-89B / L-90* evidence |
| Zora AF namespace separation | **MANDATORY** — deactivation targets **Zora-Walat legacy** only |

---

## 9. Bank / Stripe status inherited from L-90C4A

```
STRIPE_BALANCE_ZERO=YES_BY_OPERATOR_OBSERVATION
STRIPE_LIVE_KEYS_ROTATED=YES_BY_OPERATOR_OBSERVATION
VERCEL_STRIPE_ENV_REMOVED=YES_BY_OPERATOR_OBSERVATION
GITHUB_STRIPE_SECRETS_VARIABLES_CLEAN=YES_BY_OPERATOR_OBSERVATION
BANK_REPLACE=NO
ADD_NEW_BANK=NO
KEEP_EXISTING_BANK_FROZEN=YES
BANK_PARTNER_PASS=NO
```

**Planning implication:** Runtime risk is **reduced** by env/key cleanup; **code routes remain** until L-90C4C–H. Bank remains visible in Stripe — **not** removal proof.

---

## 10. Explicit NO-GO list

This document does **not** authorize:

```
PAYMENT_IMPLEMENTATION=NO-GO
PAYMENT_ROUTE_DEACTIVATION_IMPLEMENTATION=NO-GO_IN_THIS_GATE
REAL_MONEY_PASS=NO
CARD_LAUNCH_PASS=NO
WALLET_LAUNCH_PASS=NO
CUSTOMER_ONBOARDING_PASS=NO
KYC_COLLECTION_PASS=NO
MERCHANT_SETTLEMENT_PASS=NO
CASH_IN_PASS=NO
CASH_OUT_PASS=NO
PROVIDER_PASS=NO
BANK_PARTNER_PASS=NO
COMPLIANCE_PASS=NO
AFGHANISTAN_MARKET_PASS=NO
FAMILY_INCOME_PASS=NO
INVESTOR_READY=NO
IMPLEMENTATION=NO-GO
```

Also **not** authorized: payment reactivation, Stripe env reintroduction, webhook re-enablement, customer-facing checkout, merchant settlement, Zora AF payment provider wiring through legacy stack.

---

## 11. Claim locks preserved

```
GLOBAL_LAUNCH_PASS=NO
AFGHANISTAN_MARKET_PASS=NO
REAL_MONEY_PASS=NO
PROVIDER_PASS=NO
BANK_PASS=NO
COMPLIANCE_PASS=NO
MARKET_PASS=NO
INVESTOR_READY=NO
FAMILY_INCOME_PASS=NO
ZORA_AF_PAYMENT_PROVIDER_PASS=NO
STRIPE_LEGACY_PAYMENT_PASS=NO
PAYMENT_REACTIVATION_PASS=NO
STRIPE_BANK_REMOVAL_PASS=NO
GLOBAL_REAL_BUSINESS_PROOF=12%_UNCHANGED
```

---

## 12. Final verdict

```
L-90C4B=LEGACY_PAYMENT_SURFACE_CODE_FREEZE_ROUTE_DEACTIVATION_PLAN_CREATED
ROUTE_DEACTIVATION_IMPLEMENTED=NO
CODE_CHANGED=NO
PAYMENT_REACTIVATION=NO-GO
IMPLEMENTATION=NO-GO
```

---

## 13. Next recommended gate

**L-90C4C — Legacy Payment Route Inventory Proof**

- **Read-only only**
- Produce file/route/env map from repository inspection
- **No code implementation**
- **No secret values**
- Prerequisite for L-90C4D design review

---

## NON_CLAIMS

- Payment routes are **not** deactivated by this document.
- Stripe shutdown is **not** fully complete until code + deploy gates pass.
- Real-money, provider, bank, compliance, and launch passes remain **NO**.
- Zora AF has **no** payment authorization.

---

*L-90C4B complete. Docs only. No code changes. No commits.*
