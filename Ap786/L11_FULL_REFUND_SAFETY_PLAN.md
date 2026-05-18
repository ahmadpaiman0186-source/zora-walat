# L-11 — Full refund safety plan (pre-execution)

**Status:** **PLAN_READY** — **L-11 execution PENDING** — **no refund executed**  
**Date:** 2026-05-18  
**Rules:** No secrets, JWTs, env values, API keys, full card numbers, customer PII, or raw webhook payloads.

---

## Approval gate (required before any refund)

> **Do not create or execute any refund until explicit approval:**
>
> **`Approved: L-11 execute full refund`**

Until that line is recorded (chat/ticket), this document is **plan only**.

---

## 1. Goal (L-11 scope)

After **one** successful Stripe **test-mode** payment that reached **FULFILLED** / **RECHARGE_COMPLETED**, prove a **full** refund:

- Stripe money movement is initiated **manually** (Dashboard) — app does **not** call `refunds.create`
- `charge.refunded` webhook mirrors **`postPaymentIncidentStatus` → REFUNDED**
- **No** second fulfillment attempt
- **No** duplicate financial anomaly codes
- Safe operator read paths documented

**Out of scope:** L-12 partial refund, L-13 double-refund resend, new checkout/payment, webhook resend of `checkout.session.completed`.

---

## 2. Refund path map (desk — no code changes)

### 2a. App does **not** issue refunds

| Check | Result |
|-------|--------|
| `refunds.create` / Stripe Refund API from app | **Not present** in production paths (`phase1MissionObservability.test.js` audit) |
| `PHASE1_AUTOMATIC_STRIPE_REFUND_FORBIDDEN` | **true** — `paymentReconciliationRefundSafety.js` |
| `PHASE1_STRIPE_REFUND_IS_WEBHOOK_MIRROR_ONLY` | **true** — refund state mirrored from Stripe webhooks only |

### 2b. Refund mirror webhook

| Step | Location | Behavior |
|------|----------|----------|
| Stripe emits `charge.refunded` | Stripe (after Dashboard full refund) | Money SoT |
| Webhook handler | `server/src/routes/stripeWebhook.routes.js` | Calls `applyPhase1ChargeRefunded` |
| DB update | `server/src/services/phase1StripeChargeIncidents.js` | Match row by `stripePaymentIntentId`; set `postPaymentIncidentStatus` **REFUNDED**, `postPaymentIncidentMapSource` **REFUND_CHARGE_PAYLOAD**; order audit `post_payment_incident` |
| Fulfillment reversal | — | **None** — does **not** delete or reverse fulfillment attempts |
| Order lifecycle | — | **`orderStatus` / `status` unchanged** by refund mirror (typically stays **FULFILLED** + **RECHARGE_COMPLETED**) |
| New fulfillment blocked | `phase1FulfillmentPaymentGate.js` | **REFUNDED** incident → `POST_PAYMENT_INCIDENT_BLOCKS` |

### 2c. Operator / support read APIs

| API | Refund visibility |
|-----|-------------------|
| `GET /api/ops/staging-operator-order-status/:id` (harness `status-check`) | **Lifecycle + fulfillment only** — does **not** expose `postPaymentIncident` |
| `GET /api/orders/:id/phase1-truth` | **Yes** — full canonical DTO (owner JWT); **cold Vercel bootstrap may timeout** |
| `GET /api/ops/staging-operator-phase1-truth/:id` | **Yes** — slim read-only incident enums (harness `phase1-truth-check`); same gate as status-check |
| Stripe Dashboard | Payment / Refund objects (test mode) |

### 2e. Verifier timeout (root cause + fix)

| Item | Detail |
|------|--------|
| **Root cause** | `GET /api/orders/:id/phase1-truth` is served only via **full Express `getHandler()`** (`bootstrap.js` + Redis + route graph). On Vercel cold start this often exceeds harness/client timeouts (~45s). |
| **Why status-check works** | `GET /api/ops/staging-operator-order-status/:id` is routed **before** bootstrap in `api/index.mjs` (slim Prisma read). |
| **Fix (repo)** | Slim `GET /api/ops/staging-operator-phase1-truth/:id` + harness `phase1-truth-check` (read-only incident fields). Gate: `STAGING_ALLOW_OPERATOR_ORDER_STATUS=true`. |
| **Staging** | Verifier **works after deploy** of API with slim route; until then harness may return **503** `staging_operator_phase1_truth_disabled` (not a timeout). |
| **L-11 proof** | Still **blocked** — no refund; no PASS commit until live **REFUNDED** observed post-refund. |

### 2f. Operator CLI hardening (concatenation + one-shot preflight)

| Item | Detail |
|------|--------|
| **Operator failure mode** | PowerShell copy/paste glued commands (`loginnode`, `phase1-truth-checkSet-Content`) → harness printed **Usage** with no recovery hint. |
| **Fix (repo)** | `parseOperatorCliArgv` detects concatenation → `LOCAL_VALIDATION_ERROR command_concatenation_detected` + `NEXT_SAFE_COMMAND`. |
| **One-shot mode** | `l11-preflight` — token check/refresh, `status-check`, slim `phase1-truth-check`, enum-only verdict. **No refund**, no checkout, no payment. |
| **Pass output** | `L11_PREFLIGHT_VERDICT PASS`, `DO_NOT_REFUND true`, `L11_STATUS PLAN_READY` (not L-11 execution PASS). |
| **Block output** | `BLOCKED_REASON`, `NEXT_SAFE_COMMAND`, `DO_NOT_REFUND true`, `L11_PREFLIGHT_VERDICT BLOCKED`. |
| **L-11 overall** | **PLAN_READY** only until approval + Dashboard full refund + post-refund **REFUNDED** verify. |

### 2d. Automated proof already in repo (not executed for L-11 staging)

| Test | File | Proves |
|------|------|--------|
| `charge.refunded after delivery…` | `stripeWebhookHttpChaos.integration.test.js` | **REFUNDED** incident + unique anomaly codes |
| `stripe charge.refunded updates postPaymentIncident` | `phase1Resilience.integration.test.js` | Canonical DTO **REFUNDED** |
| Refund checklist | `paymentReconciliationRefundSafety.test.js` | Denies re-refund when already **REFUNDED** |

---

## 3. Candidate test payment / order (suffix only)

Use the **existing** staging success order from P-2 / L-4 / L-5 evidence (do **not** create a new checkout for L-11 prep):

| Field | Value (sanitized) |
|-------|-------------------|
| Order id suffix | **`…04pvq0dr78`** |
| Pre-refund `ORDER_STATUS` | **FULFILLED** |
| Pre-refund `PAYMENT_STATUS` | **RECHARGE_COMPLETED** |
| Pre-refund `PAID_CONFIRMED` | **true** |
| Pre-refund `FULFILLMENT_ATTEMPT_COUNT` | **1** |
| Stripe mode | **Test** (hosted checkout session was test-mode confirmed in operator runs) |

**Eligibility checks before refund (operator):**

1. Confirm order suffix matches gitignored `.staging-order-id.local` (not committed).
2. `status-check` → **200**, **FULFILLED**, **RECHARGE_COMPLETED**, fulfillment **1**.
3. `GET /api/orders/{orderId}/phase1-truth` → `postPaymentIncident.status` is **not** already **REFUNDED** (if already refunded, pick another fulfilled test order or stop).
4. `assessPhase1RefundOperatorChecklist` policy: row must show Stripe settlement (`RECHARGE_COMPLETED` or `PAYMENT_SUCCEEDED`); deny if `already_recorded_refunded_incident`.

---

## 4. Expected post-refund state (from code + tests)

| Field | Expected after full refund + webhook processed |
|-------|--------------------------------------------------|
| `postPaymentIncident.status` (phase1-truth) | **REFUNDED** |
| `postPaymentIncident.mapSource` | **REFUND_CHARGE_PAYLOAD** |
| `ORDER_STATUS` (status-check) | **FULFILLED** (unchanged — mirror only) |
| `PAYMENT_STATUS` (status-check) | **RECHARGE_COMPLETED** (unchanged) |
| `PAID_CONFIRMED` (status-check) | **true** (lifecycle still fulfilled — incident is separate) |
| `FULFILLMENT_ATTEMPT_COUNT` | **1** (no second attempt) |
| Second recharge / fulfillment | **Must not occur** |
| Stripe | Full refund in **test mode** only |

**Interpretation:** L-11 pass is **incident + safety**, not “un-fulfill” the row. Fulfillment gate blocks **new** work after **REFUNDED** incident.

---

## 5. Execution commands (documented only — **do not run** until approved)

### 5a. Pre-flight (safe — no refund)

**PowerShell: one command per line** (do not paste commands together).

```powershell
cd C:\Users\ahmad\zora_walat\server
$env:STAGING_OPERATOR_EMAIL = "you@example.com"
$env:STAGING_OPERATOR_PASSWORD = "YourStagingPassword"
Set-Content .staging-order-id.local "cmp95a2kc0003jy04pvq0dr78"
node tools/staging-auth-checkout-operator.mjs l11-preflight
```

**Recommended one-shot (after env + order id set):**

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-preflight
```

Expect `L11_PREFLIGHT_VERDICT PASS`, `DO_NOT_REFUND true`, `STATUS_CHECK_HTTP 200`, `ORDER_STATUS FULFILLED`, `PAYMENT_STATUS RECHARGE_COMPLETED`, `FULFILLMENT_ATTEMPT_COUNT 1`, `PHASE1_TRUTH_HTTP 200`, `POST_PAYMENT_INCIDENT_STATUS` not `REFUNDED`, `PREFLIGHT_REFUND_ELIGIBLE true`.

If `LOCAL_VALIDATION_ERROR command_concatenation_detected`, run the `NEXT_SAFE_COMMAND` line only.

Individual modes (optional): `login`, `status-check`, `phase1-truth-check`, `auth-check`.

### 5b. Full refund execution (**PENDING approval**)

**Primary path — Stripe Dashboard (test mode):**

1. Open Stripe Dashboard → **Test mode** on.
2. **Payments** → locate the PaymentIntent / Charge for order suffix **`…04pvq0dr78`** (use Checkout session id from gitignored `.staging-checkout-url.local` or Dashboard search — do not paste ids into Ap786).
3. **Refund** → **Full refund** (not partial).
4. Wait for `charge.refunded` webhook delivery to staging (typically seconds).
5. **Do not** resend `checkout.session.completed`.
6. **Do not** retry payment with card **4242**.

**No in-repo CLI** calls Stripe Refund API for Phase 1 hosted checkout.

### 5c. Post-refund verification (safe read-only)

```powershell
node tools/staging-auth-checkout-operator.mjs status-check
node tools/staging-auth-checkout-operator.mjs phase1-truth-check
```

Expect `POST_PAYMENT_INCIDENT_STATUS REFUNDED` after Dashboard full refund + webhook.

Capture **enum-only** evidence for `Ap786/L11_FULL_REFUND_SAFETY.md` execution section (future commit after approval).

### 5d. Integration fixture path (CI / local DB only — **not** staging L-11 default)

Pattern: `stripeWebhookHttpChaos.integration.test.js` — `charge.refunded after delivery…`  
Requires `TEST_DATABASE_URL` + `registerChaosWebhookEnv.mjs`; signs `charge.refunded` with synthetic secret. **Do not use** as substitute for staging Dashboard proof unless explicitly approved.

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Refund wrong PaymentIntent | Match order suffix **`…04pvq0dr78`** + gitignored order id file + Dashboard test mode |
| Partial refund confuses L-11 | Dashboard: **full** refund only |
| Live mode | Dashboard **test mode** toggle must be on |
| Expecting status-check to show REFUNDED | Use **phase1-truth-check** (slim) for incident; status-check stays FULFILLED |
| Legacy phase1-truth timeout | Use **slim** `/api/ops/staging-operator-phase1-truth/:id` via harness |
| Second fulfillment | Assert `FULFILLMENT_ATTEMPT_COUNT` still **1**; gate blocks new attempts |
| Double refund (L-13) | Defer duplicate refund / resend to L-13; checklist denies `already_recorded_refunded_incident` |

---

## 7. L-11 verdict (this step)

| Item | Status |
|------|--------|
| Refund code path mapped | **Done** |
| Candidate order identified (suffix only) | **`…04pvq0dr78`** |
| Execution path documented | **Dashboard full refund** (pending approval) |
| Refund executed | **No** |
| **Overall** | **PLAN_READY** |

**Next:** After **`Approved: L-11 execute full refund`**, run §5b–5c, record enums, update this file with execution section, then commit L-11 **PASS** evidence.
