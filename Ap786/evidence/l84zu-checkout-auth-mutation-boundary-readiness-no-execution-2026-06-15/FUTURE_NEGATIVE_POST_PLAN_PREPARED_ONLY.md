# L-84ZU — Future negative POST plan (PREPARED_ONLY — NOT EXECUTED)

**Status:** **PREPARED_ONLY — NOT EXECUTED**  
**L-84ZU runtime POST approval:** **NO**  
**Target host (future gate):** `https://zora-walat-api-staging.vercel.app` (operator-approved execution window only)

---

## Global probe rules (future gate)

1. **No valid Bearer tokens** unless probe explicitly tests invalid/expired tokens
2. **No Stripe dashboard/API** access
3. **No provider dashboard/API** access
4. **No payment/session/customer/provider creation** as probe outcome
5. Capture: HTTP status, response body (redacted), `Cache-Control`, absence of forbidden fields
6. **Forbidden pass evidence:** 2xx, checkout/session/payment/customer/provider IDs, `client_secret`, provider fulfillment artifact, unpaid service

---

## Checkout probes (C-series)

| ID | Probe | Method / path | Headers / body | Expected fail-closed | Forbidden if seen |
|----|-------|---------------|----------------|---------------------|-------------------|
| **C1** | No Bearer | POST `/api/create-checkout-session` | `Content-Type: application/json`, body `{}` | **401** `auth_required` | 2xx, `url`, `orderId`, session IDs |
| **C2** | Invalid Bearer | POST `/api/create-checkout-session` | `Authorization: Bearer invalid.probe.token`, body `{}` | **401** `auth_required` | 2xx, Stripe URLs, secrets |
| **C3** | Missing required body | POST `/api/create-checkout-session` | Valid Bearer (operator test JWT only if approved), body `{}` or missing fields | **400** validation / client integrity | 2xx checkout artifacts |
| **C4** | Non-JSON content-type | POST `/api/create-checkout-session` | Bearer present, `Content-Type: text/plain` | **415** `unsupported_media_type` | 2xx |
| **C5** | Alias path no Bearer | POST `/create-checkout-session` | Same as C1 | **401** | Same as C1 |
| **C6** | Payments lockdown (if env set) | POST with Bearer | When `PAYMENTS_LOCKDOWN_MODE` / prelaunch active | **503** lockdown body | 2xx checkout |

**Execution status:** **PREPARED_ONLY — NOT EXECUTED**

---

## Auth login probes (L-series)

| ID | Probe | Method / path | Body | Expected fail-closed | Forbidden if seen |
|----|-------|---------------|------|---------------------|-------------------|
| **L1** | Non-JSON | POST `/api/auth/login` | `Content-Type: text/plain`, `{}` | **400** `validation_error` | JWT access/refresh tokens |
| **L2** | Invalid JSON | POST `/api/auth/login` | `{not-json` | **400** `validation_error` | tokens |
| **L3** | Invalid credentials | POST `/api/auth/login` | `{ "email": "probe@test.invalid", "password": "invalid-probe" }` | **401** or **403** | tokens, user IDs |

**Execution status:** **PREPARED_ONLY — NOT EXECUTED**

---

## Auth register probes (R-series)

| ID | Probe | Method / path | Body | Expected fail-closed | Forbidden if seen |
|----|-------|---------------|------|---------------------|-------------------|
| **R1** | Non-JSON | POST `/api/auth/register` | `Content-Type: text/plain` | **415** `unsupported_media_type` | tokens, user creation |
| **R2** | Invalid JSON | POST `/api/auth/register` | `{not-json` | **400** `invalid_json_body` | tokens |
| **R3** | Short password | POST `/api/auth/register` | `{ "email": "probe@test.invalid", "password": "short" }` | **400** `validation_error` | tokens, 201 |
| **R4** | Prelaunch block (if env) | POST `/api/auth/register` | valid-shaped body | **403** prelaunch block | 201 user row |

**Execution status:** **PREPARED_ONLY — NOT EXECUTED**

---

## Auth OTP probes (O-series)

| ID | Probe | Method / path | Body | Expected fail-closed | Forbidden if seen |
|----|-------|---------------|------|---------------------|-------------------|
| **O1** | Non-JSON | POST `/api/auth/request-otp` | `Content-Type: text/plain` | **415** | OTP code in body |
| **O2** | Invalid JSON | POST `/api/auth/request-otp` | `{not-json` | **400** `invalid_json_body` | OTP echo |
| **O3** | Strict body violation | POST `/api/auth/request-otp` | `{ "email": "a@b.c", "extraField": "x" }` | **400** `validation_error` | OTP echo |
| **O4** | Owner-only mismatch (if env) | POST `/api/auth/request-otp` | non-owner email | **403** owner-only | 200 with dispatch proof |

**Execution status:** **PREPARED_ONLY — NOT EXECUTED**

---

## Express-only probes (future gate extension — documented, not in L-84ZU scope)

| ID | Route | Notes |
|----|-------|-------|
| **V1–V2** | POST `/api/auth/verify-otp` | Invalid OTP / malformed body → 400/401 |
| **RF1** | POST `/api/auth/refresh` | Invalid refresh token → 401 |
| **LO1** | POST `/api/auth/logout` | Invalid refresh → 401 |
| **PI1–PI2** | POST `/api/create-payment-intent` | Unauthenticated / lockdown → 401/503; **must not** return `client_secret` on negative probe |
| **Q1** | POST `/api/checkout-pricing-quote` | Invalid body → 400; **must not** create checkout session |

**Execution status:** **PREPARED_ONLY — NOT EXECUTED**

---

## Webhook reference (already executed — L-84ZR)

| ID | Probe | Result (historical) |
|----|-------|---------------------|
| W1 | POST `/api/webhooks/stripe` `{}` no signature | **400** `validation_error` |
| W2 | POST `/webhooks/stripe` `{}` no signature | **400** `validation_error` |

Not re-run in L-84ZU.

---

*End.*
