# L-84ZU — Route mutation matrix

**Source:** read-only `git grep` + handler/route inspection on main @ `d3ee222`  
**Runtime POST in L-84ZU:** **NOT EXECUTED**

## Legend

| Column | Meaning |
|--------|---------|
| **Mutation risk** | Whether the route can create/update auth, payment, session, customer, or provider artifacts |
| **Future negative probe** | Safe invalid POST plan for a **future** gate — status **PREPARED_ONLY — NOT EXECUTED** in L-84ZU |

---

## A — Slim serverless fast path (`server/api/index.mjs`)

| Route | Method | Handler | Mutation risk | Auth required | Payment/provider risk | Future negative probe allowed? |
|-------|--------|---------|---------------|---------------|----------------------|--------------------------------|
| `/api/create-checkout-session`, `/create-checkout-session` | POST | `handleSlimCreateCheckoutPost` (`slimCreateCheckoutHandler.mjs`) | **HIGH** — DB `PaymentCheckout` + Stripe Checkout session URL | Bearer JWT at index gate; handler re-validates JWT, email verified, client integrity, lockdown guards | **YES** — Stripe session + checkout row | **PREPARED_ONLY** — see [FUTURE_NEGATIVE_POST_PLAN](./FUTURE_NEGATIVE_POST_PLAN_PREPARED_ONLY.md) C1–C6 |
| `/api/auth/login`, `/auth/login` | POST | `handleSlimAuthLoginPost` | **MEDIUM** — tokens on success | Public; owner-only email gate when enforced | No direct Stripe | **PREPARED_ONLY** — L1–L3 |
| `/api/auth/register`, `/auth/register` | POST | `handleSlimAuthRegisterPost` | **HIGH** — user row + tokens on success | Public; prelaunch block + owner-only | No direct Stripe | **PREPARED_ONLY** — R1–R4 |
| `/api/auth/request-otp`, `/auth/request-otp`, `/api/auth/resend-otp`, `/auth/resend-otp` | POST | `handleSlimAuthRequestOtpPost` | **MEDIUM** — OTP issue (email/DB) | Public; endpoint rate limit + owner-only | No Stripe | **PREPARED_ONLY** — O1–O4 |
| `/webhooks/stripe` | POST | `handleSlimStripeWebhookPost` | **HIGH** — payment/fulfillment on verified events | Stripe-Signature HMAC | **YES** | **EXECUTED in L-84ZR** (W1/W2) — out of L-84ZU scope |
| `/api/ops/staging-verify-operator-email` | POST | `handleSlimStagingOperatorVerifyEmailPost` | **MEDIUM** — email verify flag (staging ops) | Operator secret / staging gate | No | **OUT OF SCOPE** — not checkout/auth consumer path |

### Index-level checkout auth gate (before slim handler)

When POST checkout **without** Bearer and **without** `X-ZW-Dev-Checkout` header ≥16 chars:

- **401** `auth_required` — inline in `index.mjs` (no handler import)

When Bearer present → slim handler. When dev header present → falls through to Express `getHandler()` (dev-only path; **not probed in L-84ZU**).

---

## B — Express fallback (`server/src/routes/` — reached via `getHandler()`)

Mounted under `/api/auth` and payment router paths.

| Route | Method | Handler / controller | Mutation risk | Auth required | Payment/provider risk | Future negative probe allowed? |
|-------|--------|---------------------|---------------|---------------|----------------------|--------------------------------|
| `/api/auth/register` | POST | `auth.postRegister` | **HIGH** | Public + middleware stack | No | **PREPARED_ONLY** (Express duplicate of slim) |
| `/api/auth/login` | POST | `auth.postLogin` | **MEDIUM** | Public + owner gate | No | **PREPARED_ONLY** |
| `/api/auth/request-otp` | POST | `auth.postRequestOtp` | **MEDIUM** | Public + rate limit | No | **PREPARED_ONLY** |
| `/api/auth/resend-otp` | POST | `auth.postResendOtp` | **MEDIUM** | Public + rate limit | No | **PREPARED_ONLY** |
| `/api/auth/verify-otp` | POST | `auth.postVerifyOtp` | **HIGH** — verifies email / issues tokens | Public + rate limit | No | **PREPARED_ONLY** — V1–V2 (Express-only; no slim test in L-84ZU) |
| `/api/auth/refresh` | POST | `auth.postRefresh` | **MEDIUM** — token rotation | Refresh token body | No | **PREPARED_ONLY** — RF1 |
| `/api/auth/logout` | POST | `auth.postLogout` | **LOW** — session revoke | Refresh token body | No | **PREPARED_ONLY** — LO1 |
| `/api/create-checkout-session` | POST | `createCheckoutSession` | **HIGH** | `requireAuth` + email verified + money-path identity | **YES** | **PREPARED_ONLY** (cold-start fallback) |
| `/api/create-payment-intent` | POST | `createTestPaymentIntent` | **HIGH** — Stripe PaymentIntent | Optional auth / owner adjacency | **YES** — PI + `client_secret` risk | **PREPARED_ONLY** — PI1–PI2 |
| `/api/checkout-pricing-quote` | POST | `createCheckoutPricingQuote` | **LOW** — pricing quote only | Anonymous (rate limited) | No session creation | **PREPARED_ONLY** — Q1 |

---

## C — Expected fail-closed responses (code-derived; not runtime-proven in L-84ZU)

### Checkout (slim)

| Condition | Expected status | Expected code (body) |
|-----------|-----------------|----------------------|
| No Bearer (index) | **401** | `auth_required` |
| No Bearer (handler) | **401** | `auth_required` |
| Invalid/expired JWT | **401** | `auth_required` |
| Non-JSON Content-Type | **415** | `unsupported_media_type` |
| `PRELAUNCH_LOCKDOWN` / payments lockdown | **503** | prelaunch/payments lockdown body |
| Missing/invalid checkout body | **400** | validation / client integrity codes |
| Unverified email (when enforced) | **403** | `auth_verification_required` |

### Auth (slim)

| Condition | Expected status | Expected code |
|-----------|----------------|---------------|
| Login: non-JSON | **400** | `validation_error` |
| Login: invalid JSON | **400** | `validation_error` |
| Login: bad credentials | **401** or **403** | `auth_invalid_credentials` / owner-only |
| Register: non-JSON | **415** | `unsupported_media_type` |
| Register: invalid JSON | **400** | `invalid_json_body` |
| Register: short password | **400** | `validation_error` |
| OTP: non-JSON | **415** | `unsupported_media_type` |
| OTP: strict body violation | **400** | `validation_error` |
| OTP: owner mismatch | **403** | `owner_only_prelaunch_access_denied` |

---

## D — Forbidden evidence on negative probes

Any future runtime negative probe **must not** produce:

- HTTP **2xx** for intentionally invalid unauthenticated checkout
- Stripe checkout session IDs, payment intent IDs, customer IDs
- `client_secret`
- Provider fulfillment references
- Unpaid service delivery

---

## E — grep inventory (abbreviated)

Commands executed (read-only):

```text
git grep -n "checkout" -- server
git grep -n "createCheckout" -- server
git grep -n "checkout.session" -- server
git grep -n "payment" -- server
git grep -n "payment_intent" -- server
git grep -n "client_secret" -- server
git grep -n "provider" -- server
git grep -n "Authorization" -- server
git grep -n "Bearer" -- server
git grep -n "auth" -- server/api server/handlers server/test
git grep -n "requestOtp\|login\|register" -- server
```

Key code anchors:

- `server/api/index.mjs` L117–269 — slim POST routing
- `server/handlers/slimCreateCheckoutHandler.mjs` — checkout orchestration + guards
- `server/handlers/slimAuth*.mjs` — auth slim handlers
- `server/src/routes/auth.routes.js` — Express auth mutations
- `server/src/routes/payment.routes.js` — Express payment mutations

---

*End.*
