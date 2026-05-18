# L-7 — Unmatched Stripe event safety

**Status:** **PASS (automated)** — staging fixture webhook traffic **PENDING** approval  
**Date:** 2026-05-18 (tests added 2026-05-18)  
**Rules:** No secrets, raw webhook payloads, keys, JWTs, PII, or full Stripe object ids in this file.

---

## 1. Purpose

Ensure events that **cannot** be correlated to Zora money rows are handled safely:

| Risk | Required behavior |
|------|-------------------|
| Unknown checkout session / unknown `internalCheckoutId` | **No** spurious PAID; **no** fulfillment |
| Unknown payment intent (fixture / CLI shape) | Fast **200** ack where slim applies; **no** fake order |
| Expired checkout session | Cancel **only** when metadata correlates to a real pending row; otherwise no-op / fast ack |
| Unrelated event types | Must not create orders or trigger fulfillment |
| Malformed envelope but valid signature | Reject or no-op safely; never bypass signature verification |
| Invalid / missing signature | **4xx** quickly; **no** DB mutation |

**Invariant:** Invalid signature → **4xx**; valid signature + no Zora correlation → **2xx** “ignored” on slim fast-ack paths where implemented — signature verification is **never** skipped.

---

## 2. Slim-layer classification (desk review) — **PASS**

**File:** `server/api/slimStripeWebhookHandler.mjs` — `stripeEventSlimUnmatchedFastAck(event)`

| Event shape | Fast ack (200 ignored)? | Notes |
|-------------|-------------------------|-------|
| `checkout.session.completed` — missing / invalid `internalCheckoutId` | **Yes** | Does **not** enter `slimProcessCheckoutSessionCompletedWebhook` |
| `checkout.session.expired` — missing / invalid `internalCheckoutId` | **Yes** | Same metadata gate as completed |
| `payment_intent.succeeded` / `payment_failed` — no `topup_order_id` | **Yes** | |
| PI with `tw_ord_*` shape but **wrong** `metadata.source` | **Yes** | Blocks Stripe CLI false positives |
| PI with Zora `metadata.source` + valid `tw_ord_*` | **No** | Hands off to full Express (webtopup) |
| Hosted `checkout.session.completed` with valid `internalCheckoutId` | **No** | Slim PAID path |
| Other event types | **No** (not unmatched) | Replays to Express `getHandler()` |

**Hosted classifier:** `server/api/slimStripeWebhookCheckoutCompleted.mjs` — `isHostedCheckoutSessionCompletedEvent` requires valid checkout id in metadata.

**Expired session (full Express):** `server/src/routes/stripeWebhook.routes.js` — `checkout.session.expired` cancels **only** `PENDING` rows with valid `internalCheckoutId`; invalid shape → early return (no cancel).

---

## 3. Scenario checklist vs evidence

| Scenario | Desk | Automated test | Staging live |
|----------|------|----------------|--------------|
| Missing `Stripe-Signature` | Pass | `slimStripeWebhookEntrypoint.test.js` — 400, no `getHandler` | Pending |
| Invalid signature | Pass | `slimStripeWebhookEntrypoint.test.js`, `stripeWebhookHttpChaos` — 400, order stays PENDING | Pending |
| Unknown `internalCheckoutId` on `checkout.session.completed` | Pass | `stripeWebhookHttpChaos` — 200, **0** fulfillment attempts | Pending |
| Unknown `internalCheckoutId` on `checkout.session.expired` | Pass | `stripeWebhookHttpChaos` — 200, no row, **0** fulfillment | Pending |
| Expired on **pending** checkout | Pass | `stripeWebhookHttpChaos` — **CANCELLED**, not PAID, **0** fulfillment | Pending |
| Fixture PI (`payment_intent.succeeded`, no Zora source) | Pass | `slimStripeWebhookEntrypoint` + `slimStripeWebhookUnmatchedFastAck.test.js` | Pending |
| `checkout.session.expired` missing metadata (slim) | Pass | `slimStripeWebhookEntrypoint` — fast ack, no `getHandler` | Pending |
| Unrelated type (`customer.created`) | Pass | `stripeWebhookHttpChaos` — 200, order unchanged | Pending |
| Unsupported type (`invoice.created`) | Pass | `stripeWebhookHttpChaos` — 200, no crash | Pending |
| Oversized body | Pass | `slimStripeWebhookEntrypoint` — 413 | Pending |
| Signature-valid hosted checkout (happy path) | Pass | `slimStripeWebhookEntrypoint` + chaos suite | Covered by L-4 |

---

## 4. Automated test coverage — **PASS**

### Classifier unit (no DB)

**File:** `server/test/slimStripeWebhookUnmatchedFastAck.test.js`

| Test | Proves |
|------|--------|
| `checkout.session.expired` without metadata | Unmatched → fast ack eligible |
| Invalid `internalCheckoutId` shape on expired | Unmatched |
| `customer.created` / `invoice.payment_succeeded` | Not slim-unmatched (Express handoff) |
| PI without `topup_order_id` / wrong `metadata.source` | Unmatched |

### Slim entrypoint (no DB)

**File:** `server/test/slimStripeWebhookEntrypoint.test.js` (run with `setupTestEnv` preload)

| Test | Proves |
|------|--------|
| Missing signature → 400, fast, no bootstrap | Signature gate |
| Invalid signature → 400, fast | Signature gate |
| Unconfigured signing secret → 503 | Fail closed |
| `checkout.session.expired` empty metadata → 200 ignored, no `getHandler` | Expired unmatched slim path |
| Fixture PI → 200 `ignored` / `unmatched_event`, no `getHandler` | Unknown PI safety |
| Zora PI metadata → `getHandler` replay | Matched webtopup only |
| Oversized body → 413 | Abuse resistance |
| `api/index.mjs` POST missing signature | Serverless entry rejects without health hook |

### Integration (DB required)

**File:** `server/test/integrations/stripeWebhookHttpChaos.integration.test.js`

| Test | Proves |
|------|--------|
| Invalid webhook signature → 400; payment PENDING; no `StripeWebhookEvent` row | No mutation on bad sig |
| Unknown `internalCheckoutId` on checkout completed → 200; no fulfillment rows | No fake order / fulfillment |
| `L-7: checkout.session.expired` unknown id → 200; no DB row; no fulfillment | No fake order |
| `L-7: checkout.session.expired` on pending checkout → CANCELLED; not PAID; 0 fulfillment | Expired does not pay or fulfill |
| `L-7: customer.created` → pending order unchanged; 0 fulfillment | Unrelated type safe |
| `L-7: invoice.created` → 200; no crash; pending unchanged | Unsupported signed event safe |

### Classifier unit

**File:** `server/test/slimStripeWebhookCheckoutCompleted.test.js`

| Test | Proves |
|------|--------|
| Valid `internalCheckoutId` → hosted slim eligible | |
| Missing metadata → **not** hosted slim path | |

### Audit anchor

**File:** `server/test/orderStateSafetyAudit.test.js` — fixture PI classified unmatched.

**File:** `server/test/stripeWebhookSignatureRejection.test.js` — Express signature rejection (no DB fixtures).

---

## 5. Staging / live fixture traffic — **PENDING**

Per Day 1 gates, the following were **not** executed in this session:

- Stripe CLI default `payment_intent.succeeded` to staging endpoint  
- Dashboard send of unrelated event types  
- Latency measurement of slim fast-ack on Vercel  

**Confirmation gate (unchanged):**

> **STOP:** Crafted webhook traffic to staging requires **“Approved: L-7 unmatched / fixture webhook test on staging”**.

---

## 6. Remaining gaps (optional)

| Gap | Notes |
|-----|--------|
| Slim HTTP test for `checkout.session.completed` missing metadata | Classifier covered; optional slim HTTP case |
| Staging Vercel latency proof for fast-ack | Requires approved fixture traffic |

No payment or webhook **production logic** was changed in this pass.

---

## 7. Production tradeoff (documented)

Unmatched **2xx** responses are a **deliberate** Stripe retry semantics tradeoff: Stripe will not infinite-retry on 4xx for verified-but-irrelevant events, while Zora avoids cold-start timeouts. Owner acceptance for go-live should reference this L-7 record.

---

## 8. L-7 verdict

| Layer | Verdict |
|-------|---------|
| Desk / slim classification | **PASS** |
| Classifier + slim HTTP tests | **PASS** |
| Express HTTP integration tests (chaos suite) | **PASS** (when integration DB configured) |
| Staging live fixture webhook traffic | **PENDING** |
| **Overall L-7** | **PASS (automated)** — staging fixtures still **PENDING** |

**Investor read:** Unknown checkout ids, expired sessions, unrelated event types, and unsupported signed events are **covered by automated tests** (no fake PAID, no spurious fulfillment). **Live staging fixture** sends were **not** executed.
