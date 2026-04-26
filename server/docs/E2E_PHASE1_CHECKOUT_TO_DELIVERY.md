# End-to-end: Phase 1 mobile top-up (Stripe → wallet on order path → fulfillment)

This document describes the **strongest single money-adjacent purchase flow** in the repo today: **Stripe Checkout for `PaymentCheckout` (airtime / catalog)**, not the separate **wallet top-up** HTTP path (`POST /api/wallet/topup`).

## Sequence (happy path)

1. **Client** — Authenticated user creates a checkout session (`POST /create-checkout-session` or Phase-1 equivalent wired in `paymentController` / routes); client completes payment in Stripe Checkout.
2. **Stripe** — Sends `checkout.session.completed` to **`POST /stripe/webhook`** (raw body; signature verified in `stripeWebhook.routes.js`).
3. **Idempotency** — Handler inserts `StripeWebhookEvent` keyed by Stripe `event.id` (`P2002` → duplicate delivery safe, 200 `received: true`). Optional Redis “shadow ack” reduces duplicate work when DB insert races.
4. **Domain apply** — `applyPhase1CheckoutSessionCompleted` validates session totals/metadata vs `PaymentCheckout`, transitions payment + order state, may record anomalies for reconciliation (see `FINANCE_TRUTH_AND_RECONCILIATION.md`).
5. **Fulfillment schedule** — On success, `scheduleFulfillmentProcessing(orderId)` enqueues or triggers worker path (`fulfillmentProcessingService.js`); queue mode requires `FULFILLMENT_QUEUE_ENABLED` + Redis per env.
6. **Worker / provider** — Attempts move through `QUEUED` → `PROCESSING` → `SUCCEEDED` or terminal failure / manual-review signals per `PHASE1_STATE_MACHINE.md` and provider adapters (e.g. mock, Reloadly).
7. **Customer visibility** — `GET /api/transactions` and `GET /api/transactions/:id` expose `orderId`, `trackingStageKey`, `trustStatusKey`, masked recipient suffix, provider reference suffix, and fee transparency fields (`transactionsService.js`).

## Stripe failure / dispute paths (scoped, real)

- **Refund:** `charge.refunded` → `applyPhase1ChargeRefunded` (`phase1StripeChargeIncidents.js`). See `PHASE1_REFUND_AND_DISPUTE.md`.
- **Dispute:** `charge.dispute.created` → `applyPhase1DisputeCreated` (records incident; does not silently “unpay” without reading that module’s contract).
- **Expired checkout:** `checkout.session.expired` cancels pending checkout in DB when metadata shape is valid.

## What is intentionally **not** the same flow

- **Wallet top-up** (credit `UserWallet` from Stripe or dev paths) uses **`userWalletService`** and **ledger** idempotency; see `WALLET_TOPUP_LOCAL_VERIFY.md` / `WALLET_LEDGER_INVARIANT.md`.
- **Web top-up orders** (`tw_ord_…`) use `payment_intent.*` handlers in `webtopupWebhookHandlers.js` inside the same webhook router.

## Sandbox vs production readiness

- **Mock airtime** — Deterministic fulfillment for CI and local proof; not carrier truth.
- **Reloadly** — Real provider I/O; requires credentials, operator map, and sandbox/production flags. Production gates: `PHASE1_PRODUCTION_SAFETY_GATES.md`, `gate-check.mjs`.

## Proof commands (operator)

From `server/`:

```bash
npm run test
npm run db:migrate:integration   # if using TEST_DATABASE_URL or integration DB
npm run verify:wallet-topup-idempotency
npm run test:integration        # needs migrated Postgres + CI-style vars as documented
npm run gate:check
```

Phase-1 purchase integration coverage includes `test/integrations/phase1MoneyPath.test.js` when `TEST_DATABASE_URL` is set.
