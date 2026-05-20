# Zora-Walat order state safety report — 2026-05-15

## 1. Executive summary

Phase 1 money path (`PaymentCheckout` + Stripe Checkout Session + webhooks) and web top-up (`WebTopupOrder` + PaymentIntent metadata) were reviewed against the stated safety goals. The codebase already enforces **webhook-only** transition into paid for hosted checkout (Layer 3 state machine + `updateMany` guards), **DB idempotency** via `StripeWebhookEvent` (`P2002` replay path), and a **single fulfillment payment gate** (`canOrderProceedToFulfillment`) that requires server-confirmed payment status, `PAID` order lifecycle (worker mode), payment correlation fields, and blocks post-payment incidents (refund / dispute).

No **critical** gap was proven that would justify an unsolicited production code change in this pass. Remaining risk is mainly **operational** (misconfigured env, provider outages, ledger post failure throwing after partial intent — existing paths log and rely on Stripe retries where appropriate).

## 2. Current state machine (authoritative surfaces)

### PaymentCheckout (`orderStatus` + `status`)

| Phase | `orderStatus` | `status` (payment row) | Typical authority |
|-------|---------------|-------------------------|-------------------|
| API creates row | `PENDING` | `INITIATED` → `CHECKOUT_CREATED` / `PAYMENT_PENDING` | Authenticated checkout API + Prisma |
| Paid | `PAID` | `PAYMENT_SUCCEEDED` | `checkout.session.completed` after `constructEvent`, inside `prisma.$transaction` |
| Queued / processing | `PAID` → `PROCESSING` | `RECHARGE_PENDING` etc. | Fulfillment worker / `scheduleFulfillmentProcessing` |
| Terminal success | `FULFILLED` | `RECHARGE_COMPLETED` | Provider success path |
| Terminal failure / cancel | `FAILED` / `CANCELLED` | `PAYMENT_FAILED` / … | Webhook truth rejection, `checkout.session.expired`, incidents |

Canonical allowed **order** transitions: `src/domain/orders/orderLifecycle.js` (`assertTransition`).

Layer 3 logical map: `src/payment/paymentStateMachine.js` (`paymentCheckoutRowToL3State`, `validateLayer3WebPaidTransition`). **PAID** from **PAYMENT_PENDING** requires `authority: 'stripe_webhook'`.

### Web top-up (`WebTopupOrder`)

Payment and fulfillment transitions: `src/domain/topupOrder/webtopupStateMachine.js` + `src/services/topupOrder/webtopupWebhookHandlers.js` (`handleWebTopupPaymentIntentSucceeded` / `Failed`). Metadata `topup_order_id` + row lookup before any paid transition.

### Stripe webhook HTTP

- **Vercel slim entry:** `server/api/slimStripeWebhookHandler.mjs` — signature before bootstrap; fast-ack unmatched fixtures (no order mutation).
- **Full handler:** `server/src/routes/stripeWebhook.routes.js` — `constructEvent`, then `prisma.$transaction`: insert `StripeWebhookEvent` by `event.id`, route by `event.type`, idempotent duplicate handling (`P2002` + optional fulfillment nudge).

## 3. Unsafe transitions investigated

| Concern | Finding | Severity |
|--------|---------|----------|
| Mark paid without verified webhook | `validateLayer3WebPaidTransition`; paid `updateMany` requires `orderStatus: PENDING` and `status` in pre-paid set; `completedByWebhookEventId` set with `eventId` | Not reproduced as exploitable |
| Duplicate payment / ledger | `StripeWebhookEvent` PK; `postPaymentCapturedLedger` idempotency keys; `updateMany` count 0 → noop + fortress log | Low residual (operator mis-read logs) |
| Double fulfillment | `ensureQueuedFulfillmentAttempt` + `@@unique([orderId, attemptNumber])`; duplicate fulfillment telemetry in fulfillment stack | Low |
| Fulfill unpaid | `canOrderProceedToFulfillment` requires `PAYMENT_SUCCEEDED` + `PAID` (default) + PI or `evt_` correlation; incident block for refund/dispute | Not reproduced |
| Ignore refund / cancel | `charge.refunded` / disputes via `applyPhase1ChargeRefunded` / `applyPhase1DisputeCreated`; gate blocks on incident | Medium — depends on incident row staying aligned with Stripe |
| Corrupt state on retry | `P2002` branch replays safe subset; Redis shadow ack for duplicates | Medium — Redis optional; DB is source of truth |
| Silent critical errors | Webhook route logs + metrics; some paths rethrow for Stripe retry | Medium — must keep dashboards wired |

## 4. Fixes applied (this change set)

- **Documentation:** this report.
- **Tests:** `server/test/orderStateSafetyAudit.test.js` — unit-level regression anchors for L3 authority, fulfillment gate, replay eligibility, slim PI fixture fast-ack, and webhook signature rejection (cross-suite reference).

No Prisma schema or runtime handler logic was modified in this pass (no proven defect).

## 5. Tests run

From `server/`:

- `npm run lint` — **not defined** in `package.json`.
- `npm run typecheck` — **not defined** in `package.json`.
- `npm run build` — **not defined** in `package.json`.
- `npm test` — **failed** at `scripts/unit-test-db-precheck.mjs`: `DATABASE_URL` set but not usable for tests (`PrismaClientInitializationError`). Full suite was **not** executed in a green state on this machine.
- **Targeted (no DB):**  
  `node --import ./test/setupTestEnv.mjs --test test/orderStateSafetyAudit.test.js` — **10/10 passed**.

## 6. Remaining risks

1. **Cold path / timeout:** Full Express webhook still heavy; slim path mitigates fixtures; real sessions must complete within platform limits.
2. **Ledger throw after row update:** Rare window where Stripe retries matter — existing error handling should be monitored.
3. **Legacy rows** without `userId` or without expected metadata: webhook no-ops by design; reconciliation jobs may be needed.
4. **Human / config error:** Wrong webhook secret or wrong Stripe mode remains the dominant real-world failure mode.

## 7. Production readiness status

**Not claimed production-ready solely from this document.** Staging probes (`/api/index`, `/api/health`, `/ready`) and Stripe delivery 2xx were verified in prior work; this audit adds traceability and unit anchors, not a full release gate.

## 8. Next step: authenticated real checkout test

Run a **real** hosted checkout (authenticated user) against staging, complete payment in Stripe test mode, confirm:

1. `checkout.session.completed` delivery **2xx** with internal `metadata.internalCheckoutId`.
2. `PaymentCheckout` transitions to `PAID` / `PAYMENT_SUCCEEDED` with `completedByWebhookEventId` set.
3. Fulfillment queue or worker processes without manual intervention (within SLA).
