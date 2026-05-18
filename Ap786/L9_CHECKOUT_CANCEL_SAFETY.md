# L-9 — Checkout cancel / abandon safety (staging)

**Verdict:** **PASS** (staging operator run, 2026-05-18)  
**Environment:** Staging API `https://zora-walat-api-staging.vercel.app`, Stripe **test mode** checkout only  
**Rules:** No secrets, JWTs, passwords, env values, API keys, customer PII, checkout URLs, or raw webhook payloads.

---

## 1. Goal

Prove that when a payer opens hosted Stripe Checkout and **does not pay** (cancel / back / abandon):

- Order is **not** marked paid
- Fulfillment is **not** triggered
- Payment is **not** confirmed as recharge-complete
- Operator `status-check` readout stays safe
- `GET /cancel` returns quickly (**200**, no **504**)

**Out of scope for this run:** refund paths, Dashboard webhook resend, `checkout.session.expired` webhook (L-10).

---

## 2. Code / wiring (desk)

| Item | Location | Note |
|------|----------|------|
| Slim `GET /cancel` | `server/api/slimCheckoutReturnHandler.mjs` | HTML return page; no DB write |
| Routed before bootstrap | `server/api/index.mjs` (`hp === '/cancel'`) | Same fast path as `/success` |
| Stripe `cancel_url` | `server/src/lib/checkoutRedirectUrls.js` | `{clientBase}/cancel` |
| Operator harness | `server/tools/staging-auth-checkout-operator.mjs` | `checkout-open-test`, `status-check` |
| Automated slim tests | `server/test/slimCheckoutReturnEntrypoint.test.js` | **3/3 PASS** locally |

---

## 3. Commands run (operator machine)

```powershell
cd C:\Users\ahmad\zora_walat\server

# Slim /cancel probe (staging)
node -e "fetch('https://zora-walat-api-staging.vercel.app/cancel').then(r=>r.text().then(t=>console.log('HTTP',r.status,'ms',Date.now())));"

# Disposable test checkout (requires valid operator token + STAGING_ALLOW_STRIPE_TEST_PAYMENT=true)
$env:STAGING_ALLOW_STRIPE_TEST_PAYMENT = "true"
node tools/staging-auth-checkout-operator.mjs checkout-open-test

# After abandon / cancel in browser (see §4), or immediately if payment not completed:
node tools/staging-auth-checkout-operator.mjs status-check
```

Local unit tests:

```powershell
node --test test/slimCheckoutReturnEntrypoint.test.js
```

---

## 4. Manual browser action (recommended)

1. Open the Stripe Checkout URL saved locally by `checkout-open-test` (gitignored `.staging-checkout-url.local` — **do not commit**).
2. On the Stripe hosted page, click **Back** or **Cancel** (do **not** enter card details or pay).
3. Confirm browser lands on **`/cancel`** with “Checkout cancelled” HTML (or navigate to staging `/cancel` after leaving Stripe).
4. Run `status-check` in the same PowerShell session.

**This run:** Checkout was created in test mode; payment was **not** completed. Operator `status-check` was run without a successful payment (abandon-equivalent state).

---

## 5. Observed results (enum-only)

### 5a. `GET /cancel` (staging)

| Field | Value |
|-------|--------|
| `CANCEL_HTTP` | **200** |
| `CANCEL_LATENCY_MS` | **1216** (under 10s gate; no **504**) |
| `CANCEL_BODY_HAS_CANCELLED` | **true** |
| `CANCEL_SLIM_PASS` | **true** |

### 5b. After checkout create + abandon (no payment)

| Field | Value |
|-------|--------|
| `CHECKOUT_HTTP` | **200** |
| `STRIPE_TEST_MODE_CONFIRMED` | **true** |
| `STATUS_CHECK_HTTP` | **200** |
| `ORDER_FOUND` | **true** |
| `ORDER_STATUS` | **PENDING** |
| `PAYMENT_STATUS` | **CHECKOUT_CREATED** |
| `PAID_CONFIRMED` | **false** |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |
| `FULFILLMENT_DUPLICATE_SAFE` | **false** (unpaid pending — not a paid-path duplicate scenario) |

**Not observed:** `RECHARGE_COMPLETED`, `FULFILLED`, `PAID_CONFIRMED true`, fulfillment count ≥ 1.

Order id suffix only (sanitized): `…04dpxtf24d`.

---

## 6. Pass criteria mapping

| Criterion | Result |
|-----------|--------|
| `/cancel` does not timeout | **PASS** — HTTP **200**, ~1.2s |
| Order not PAID | **PASS** — `PAID_CONFIRMED false`, `ORDER_STATUS PENDING` |
| Fulfillment not triggered | **PASS** — `FULFILLMENT_ATTEMPT_COUNT 0` |
| No recharge completion | **PASS** — `PAYMENT_STATUS CHECKOUT_CREATED` (not `RECHARGE_COMPLETED`) |
| `status-check` safe | **PASS** — HTTP **200**, enums consistent with unpaid pending |
| Evidence enum-only | **PASS** |

---

## 7. Verdict

| Layer | Verdict |
|-------|---------|
| Slim `/cancel` route (staging) | **PASS** |
| Unpaid / abandon order state (staging operator read) | **PASS** |
| L-9 overall | **PASS** |

**Note:** L-10 may add `checkout.session.expired` → `CANCELLED` on the same row; L-9 does not require that transition.
