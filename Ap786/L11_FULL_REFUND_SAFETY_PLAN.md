# L-11 — Full refund safety plan (pre-execution)

**Status:** **PLAN_READY** — **EXECUTION_BLOCKED_STRIPE_VERIFICATION** — **no refund executed**  
**Date:** 2026-05-18  
**Rules:** No secrets, JWTs, env values, API keys, full card numbers, customer PII, or raw webhook payloads.

---

## Approval gate (required before any refund)

> **Do not create or execute any refund until explicit approval:**
>
> **`Approved: L-11 execute full refund`**

Until that line is recorded (chat/ticket), this document is **plan only**.

---

## Current blocker (2026-05-19, post-execute)

| Item | Detail |
|------|--------|
| **Blocker code** | **WEBHOOK_MIRROR_PENDING** / `L11_REFUND_PROOF_VERDICT BLOCKED` |
| **Refund executed** | **Yes** (operator harness `l11-refund-execute`, test mode, full amount) |
| **Stripe** | Refund succeeded (`REFUND_ALREADY_EXISTS` becomes true) |
| **App** | `POST_PAYMENT_INCIDENT_STATUS` still **NONE** until `charge.refunded` webhook mirrors |
| **State** | **STATE_C_REFUND_EXISTS_APP_NOT_UPDATED** |
| **Fix** | Deploy slim `charge.refunded` handler; resend test-mode `charge.refunded` (no second refund) |
| **Evidence** | `Ap786/L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md` |

---

## Prior blocker (2026-05-19, key resolution)

| Item | Detail |
|------|--------|
| **Blocker code** | **STRIPE_KEY_RESOLUTION_BLOCKED** / `ROOT_CAUSE_CODE stripe_key_not_test` |
| **Symptom** | `l11-discover-refundable-order` → `DISCOVER_VERDICT BLOCKED` after staging login succeeds |
| **Root cause (repo)** | When operator sets `STAGING_OPERATOR_EMAIL` / `PASSWORD` in shell, harness used `override: false` for **both** `.env` and `.env.local`, so `.env.local` could **not** override `.env` `STRIPE_SECRET_KEY` (e.g. live/placeholder in `.env`, test key only in `.env.local`). Secondary: quoted keys and raw-vs-normalized mismatch between `resolveStripeSecretRaw` and `isStripeTestModeSecret`. |
| **Fix (repo)** | `loadOperatorDotenv`: `.env` no override, `.env.local` override; canonical `resolveL11OperatorStripeKey`; mode **`l11-key-diagnose`**; discover/diagnose use normalized test key only. |
| **Prior blocker** | **EXECUTION_BLOCKED_STRIPE_VERIFICATION** (metadata/suffix — addressed in `46d77ea`) |
| **Refund executed** | **No** — `l11-refund-execute` **not** run this session |
| **Last operator diagnose (pre-fix)** | `L11_STRIPE_DIAG_VERDICT BLOCKED`, `ROOT_CAUSE_CODE stripe_order_metadata_mismatch` with `PAYMENT_INTENT_RETRIEVE_BY_FULL_ID true`, `PAYMENT_INTENT_SEARCH_BY_METADATA false`, `PAYMENT_INTENT_SUFFIX_MATCH false`, amount/currency/livemode OK |
| **Root cause (forensic)** | (1) **Hosted Checkout**: order linkage often on **Checkout Session** metadata / `client_reference_id`, not PI metadata — metadata search fails by design. (2) **Suffix compare bug**: API `safeSuffix` tails vs harness `…` ellipsis / wrong DB suffix column → false `PAYMENT_INTENT_SUFFIX_MATCH`. (3) **Stale `.staging-order-id.local`** or wrong candidate order → metadata mismatch despite valid PI retrieve. (4) **`evaluateL11RefundTarget`** referenced missing `order_id_present` check → false `missing_order_id` on target path (fixed). |
| **Fix (repo, this commit)** | `piSuffixesMatch` / `normalizeSuffixTail`; `stale_db_payment_intent_suffix` vs `stripe_payment_intent_suffix_mismatch`; **strong PI id proof** allows `PASS_WITH_METADATA_WARNING` (not L-11 PASS); modes **`l11-mapping-diagnose`**, **`l11-discover-refundable-order`** (Stripe-scored), **`l11-refresh-order-ref`** (gitignored order file only); refund-target uses suffix-safe mapping + `READY_FOR_OPERATOR_APPROVAL` (never `PASS`). |
| **L-11 PASS** | **Not** claimed — remains **PLAN_READY** until live `l11-stripe-diagnose` shows `READY_*` + `l11-refund-target` `READY_FOR_OPERATOR_APPROVAL` + approved `l11-refund-execute` + `l11-post-refund-verify` shows **REFUNDED** with fulfillment count **1**. |

**Next safe command (operator):**

```powershell
cd C:\Users\ahmad\zora_walat\server
node tools/staging-auth-checkout-operator.mjs l11-key-diagnose
node tools/staging-auth-checkout-operator.mjs l11-discover-refundable-order
node tools/staging-auth-checkout-operator.mjs l11-refresh-order-ref
node tools/staging-auth-checkout-operator.mjs l11-mapping-diagnose
node tools/staging-auth-checkout-operator.mjs l11-stripe-diagnose
node tools/staging-auth-checkout-operator.mjs l11-refund-target
```

Do **not** set `L11_REFUND_APPROVAL` or run `l11-refund-execute` until the chain above is `READY_*` / `READY_FOR_OPERATOR_APPROVAL` on staging with test key only.

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

### 2g. Staging API 404 on login (wrong Vercel deployment surface)

| Item | Detail |
|------|--------|
| **Symptom** | `LOGIN_HTTP 404`, `http_404_empty_body` or **Next.js HTML** on `POST /api/auth/login` — **not** a password/credential issue. |
| **Root cause (live verify 2026-05-18)** | Production alias **`zora-walat-api-staging.vercel.app`** is serving **Next.js frontend** (monorepo root deploy), not **`server/api/index.mjs`**. `/api/health`, `/api/index`, and slim operator routes all return **404 HTML**. |
| **Fix** | Redeploy **from `server/` only**: `cd server; npm run deploy:staging` (runs deploy guard + `vercel deploy --prod --yes`). Confirm `vercel inspect` shows **`λ api/index`**, not Next lambdas. |
| **Harness** | `staging-api-smoke` prints `ROUTE_DIAGNOSIS route_missing_or_wrong_deployment` + `NEXT_SAFE_COMMAND`. `login` on 404 HTML does **not** suggest password retry. |
| **L-11** | **PLAN_READY** — blocked until API surface restored; then `staging-api-smoke` PASS → `l11-preflight`. |

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

**First — confirm API surface (no credentials):**

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs staging-api-smoke
```

Expect `STAGING_API_SMOKE_VERDICT PASS`. If `route_missing_or_wrong_deployment`, run `cd server; npm run deploy:staging` before login or L-11.

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

### 5a2. Stripe key diagnose (read-only — **run first when discover shows `stripe_key_not_test`**)

No refund. Enum-only output. Does **not** call Stripe when key is missing, live, malformed, or placeholder.

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-key-diagnose
```

Expect on success: `L11_KEY_DIAG_VERDICT PASS`, `STRIPE_SECRET_KEY_MODE test_secret` or `test_restricted`, `STRIPE_SECRET_KEY_EFFECTIVE_SOURCE env_local` (typical), `STRIPE_ACCOUNT_MODE test_only`.  
On live key: `KEY_MODE live_blocked`, `ROOT_CAUSE_CODE stripe_key_not_test` — fix `server/.env.local` (gitignored) with `sk_test_…` or `rk_test_…` only; ensure `.env.local` overrides `.env`.

### 5b. Stripe diagnose (read-only — **run when execute blocked on STRIPE_VERIFIED**)

No refund, no mutations. Enum-only output (`ROOT_CAUSE_CODE`, suffix-only account id, boolean checks).

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-stripe-diagnose
```

Expect on success: `L11_STRIPE_DIAG_VERDICT PASS` or `PASS_WITH_METADATA_WARNING`, `L11_READINESS READY_FOR_OPERATOR_APPROVAL` or `READY_WITH_METADATA_WARNING`, `ROOT_CAUSE_CODE ok` or `stripe_metadata_warning_strong_pi_proof`, `PAYMENT_INTENT_RETRIEVE_BY_FULL_ID true`, `AMOUNT_MATCH true`, `LIVEMODE_FALSE true`, `REFUND_ALREADY_EXISTS false`.  
On failure: `ROOT_CAUSE_CODE` one of `stripe_key_missing`, `stripe_key_not_test`, `stale_db_payment_intent_suffix`, `stripe_order_metadata_mismatch` (no strong PI proof), `stripe_payment_intent_not_found`, `stripe_payment_intent_suffix_mismatch`, `stripe_permission_denied`, `stripe_amount_mismatch`, etc.  
**Never** treat `L11_STRIPE_DIAG_VERDICT PASS` as L-11 overall PASS — post-refund verify still required.

Typo alias: `111-stripe-diagnose` → canonical `l11-stripe-diagnose` (harness prints `CANONICAL_MODE`).

### 5b2. DB ↔ Stripe mapping (read-only — when diagnose shows metadata or suffix issues)

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-mapping-diagnose
```

Alias: `l11-db-stripe-mapping` (same output). Prints suffix/enums only: `ORDER_ID_SUFFIX`, `ORDER_STATUS`, `PAYMENT_STATUS`, `PAID_CONFIRMED`, `FULFILLMENT_ATTEMPT_COUNT`, `INTERNAL_CHECKOUT_ID_SUFFIX`, `CHECKOUT_SESSION_ID_SUFFIX`, `DB_PAYMENT_INTENT_ID_SUFFIX`, `DB_CHARGE_ID_SUFFIX`, `STRIPE_PAYMENT_INTENT_ID_SUFFIX`, `STRIPE_CHARGE_ID_SUFFIX`, `STRIPE_METADATA_KEYS_PRESENT`, `STRIPE_METADATA_INTERNAL_CHECKOUT_MATCH`, `STRIPE_METADATA_ORDER_ID_MATCH`, `STRIPE_METADATA_CHECKOUT_SESSION_MATCH`, `DB_TO_STRIPE_MAPPING_VERDICT`, `ROOT_CAUSE_CODE`, `NEXT_SAFE_COMMAND`.

### 5b3. Discover refundable staging orders (read-only, Stripe-scored)

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-discover-refundable-order
```

Lists **FULFILLED** + **RECHARGE_COMPLETED** + `paidConfirmed` + `fulfillmentAttemptCount` **1** candidates; scores each with local test-key Stripe read (suffix/enums only). If current order file is stale, run **`l11-refresh-order-ref`** (updates **only** gitignored `.staging-order-id.local`, no DB mutation, no commit).

### 5c. Refund target discovery (read-only — **preferred over Dashboard**)

**Manual Stripe Dashboard navigation is deprecated** (error-prone). Use harness mapping from DB + optional local Stripe test-key verify.

Requires: operator login env, `STRIPE_SECRET_KEY=sk_test_…` in gitignored `server/.env.local`, order file set to **`cmp95a2kc0003jy04pvq0dr78`**.

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-refund-target
```

Expect: `L11_REFUND_TARGET_VERDICT READY_FOR_OPERATOR_APPROVAL` (or `READY_WITH_METADATA_WARNING` when strong PI proof without metadata linkage), `DO_NOT_REFUND true`, suffix-only Stripe ids, `POST_PAYMENT_INCIDENT_STATUS` not `REFUNDED`, `REFUND_ALREADY_EXISTS false`. **Not** overall L-11 PASS.

Slim API: `GET /api/ops/staging-operator-refund-target/:orderId` (suffix-only Stripe ids in response).

### 5d. Full refund execution (**second approval gate**)

**Guarded path — Stripe Refund API (test mode only, full amount):**

```powershell
cd C:\Users\ahmad\zora_walat\server
$env:L11_REFUND_APPROVAL = "Approved: L-11 execute full refund"
node tools/staging-auth-checkout-operator.mjs l11-refund-execute
```

Requires: `l11-preflight` PASS, `l11-stripe-diagnose` PASS, `l11-refund-target` PASS, exact order id, test key only, no prior refund.

Expect before refund: `FINAL_REFUND_GUARD_PASS true`, `REFUND_MODE full`, `STRIPE_MODE test_only`.  
After: `REFUND_CREATED true`, `REFUND_ID_SUFFIX` only (no full ids).

**Dashboard manual refund:** fallback only if `l11-refund-execute` blocked — use `DASHBOARD_SEARCH_HINT` from `l11-refund-target`.

### 5e. Post-refund verification

```powershell
cd C:\Users\ahmad\zora_walat\server; node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
```

Expect: `L11_REFUND_PROOF_VERDICT PASS`, `POST_PAYMENT_INCIDENT_STATUS REFUNDED`, lifecycle still **FULFILLED** / **RECHARGE_COMPLETED** / fulfillment **1**.

Do **not** commit proof until this passes. L-11 remains **PLAN_READY** until then.

### 5e. Integration fixture path (CI / local DB only — **not** staging L-11 default)

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
| Refund executed | **No** (use §5c only with `L11_REFUND_APPROVAL` env) |
| Guarded operator modes | **`l11-mapping-diagnose`**, **`l11-discover-refundable-order`**, **`l11-refresh-order-ref`**, **`l11-stripe-diagnose`**, **`l11-refund-target`**, **`l11-refund-execute`**, **`l11-post-refund-verify`** |
| Stripe verification blocker | **EXECUTION_BLOCKED_STRIPE_VERIFICATION** — run discover → refresh → mapping → diagnose on staging |
| **Overall** | **PLAN_READY** — **not PASS** — proof commit blocked until `l11-post-refund-verify` PASS |

**Next:** `l11-discover-refundable-order` → `l11-refresh-order-ref` → `l11-mapping-diagnose` → `l11-stripe-diagnose` (`READY_*`) → `l11-refund-target` (`READY_FOR_OPERATOR_APPROVAL`) → (separate approval) `l11-refund-execute` → `l11-post-refund-verify` → then record enums and commit proof.
