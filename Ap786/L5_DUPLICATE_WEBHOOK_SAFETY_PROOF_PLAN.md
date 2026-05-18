# L-5 — Duplicate webhook safety proof plan

**Goal:** Demonstrate that **duplicate delivery** of the same Stripe event (or same payment outcome) does **not** double-charge in app state, double-queue fulfillment, or corrupt ledger semantics.

**Execution:** Dry-run until L-4 confirmation; then same resend flow with stricter assertions.

## Layers (from existing design summary)

| Layer | Mechanism (high level) |
|-------|------------------------|
| DB | `StripeWebhookEvent.id` unique — second insert → `P2002` path; handlers must no-op safely |
| Redis shadow | Fast ack for retries; **gated** so pending paid transitions are not skipped incorrectly |
| Fulfillment | `scheduleFulfillmentProcessing` / worker idempotency — terminal orders should not spawn parallel work |

Code references are in-repo (`stripeWebhook.routes.js`, `moneyPathRedisRegistry.js`, `phase1StripeCheckoutSessionCompleted.js`); **do not** paste secrets or payloads into Ap786.

## Proof scenarios (staging, after confirmation)

### A. Same `checkout.session.completed` event id (Dashboard resend)

Follow `L4_STRIPE_WEBHOOK_RESEND_PLAN.md`.

**Pass criteria:**

- `status-check`: `FULFILLMENT_ATTEMPT_COUNT` unchanged from baseline **1** for the verified milestone order (unless product intentionally allows a second attempt — not expected here).
- `FULFILLMENT_DUPLICATE_SAFE` = **true**.

### B. Second payment with **new** Stripe event id (optional, only if fresh checkout approved)

Out of scope unless product approves a **new** test payment. If run:

- New checkout session → new `evt_*`; first delivery should PAID; second unrelated event should not attach to wrong order (metadata correlation).

## Evidence to capture (sanitized)

- Before / after tables: HTTP 200 on webhook, operator flags only.
- One-line Vercel search keywords (no JSON paste).

## Confirmation gate

> **STOP:** Duplicate proof that fires additional webhooks requires **“Approved: L-5 duplicate webhook proof on staging”**.
