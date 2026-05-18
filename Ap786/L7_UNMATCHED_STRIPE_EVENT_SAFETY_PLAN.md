# L-7 — Unmatched Stripe event safety plan

**Purpose:** Ensure events that **cannot** be correlated to Zora money rows are handled **safely** (no spurious PAID, no stack crash, predictable HTTP semantics for Stripe retries).

## Slim-layer behavior (conceptual)

The serverless Stripe entry verifies **signature** first, then classifies:

- **Hosted `checkout.session.completed`** with valid `internalCheckoutId` metadata → **slim processing** path.
- **Unmatched or non-Zora-shaped** events (e.g. CLI `payment_intent.succeeded` without Zora metadata) → **fast ack** paths that **do not** load full Express, so cold start does not apply — see `api/slimStripeWebhookHandler.mjs` (`stripeEventSlimUnmatchedFastAck` and related).

**Invariant:** Invalid signature → **4xx**; valid signature but no Zora correlation → **2xx ack** with explicit “ignored” style response where implemented — **never** bypass signature verification.

## Proof checklist (manual / after confirmation)

| Step | Action |
|------|--------|
| 1 | Send a **signed** fixture event known to be **unmatched** (e.g. Stripe CLI default PI without Zora `metadata.source`) **only** in test mode and **only** after approval |
| 2 | Observe HTTP **2xx** quickly (< 1 s target for slim ack paths) |
| 3 | Confirm **no** `PaymentCheckout` row changes via `status-check` on an unrelated order id |
| 4 | Vercel logs: confirm breadcrumb shows **ignored / unmatched** class — **no payload paste** |

## Negative test (signature)

- Request with missing `Stripe-Signature` → expect **400** quickly (no bootstrap).

## Evidence capture

- HTTP status + latency bucket only.
- Optional: event **type** string and **suffix** of Stripe-generated id.

## Confirmation gate

> **STOP:** Sending crafted webhook traffic to staging requires **“Approved: L-7 unmatched / fixture webhook test on staging”**.

## Production note

Unmatched 2xx behavior is a **deliberate tradeoff** with Stripe retry semantics; document owner acceptance in go-live pack.
