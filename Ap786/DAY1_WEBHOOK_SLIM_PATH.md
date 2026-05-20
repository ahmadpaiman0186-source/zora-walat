# Day 1 — Stripe webhook slim path (`checkout.session.completed`)

## Problem (prior)

`POST /webhooks/stripe` verified the Stripe signature in the slim layer, then handed off to **full Express** for `checkout.session.completed`. Cold start could **exceed platform time limits**, so the **order never transitioned to PAID** in the database even after successful payment.

## Fix (committed + deployed)

- For **hosted checkout** `checkout.session.completed` events (correlatable internal checkout id in session metadata), processing runs on a **dedicated slim module** after signature verification.
- Reuses the same **domain transition** logic as the Express route (`applyPhase1CheckoutSessionCompleted` inside a Prisma transaction) so behavior stays consistent.
- **Heavy or async side work** (e.g. fulfillment scheduling, fee follow-ups) is **not** intended to block the HTTP response path beyond the DB transaction; post-commit work is queued asynchronously per implementation.

## Observability (safe logs only)

Structured logs are designed to include **event type**, **suffixes** of Stripe ids / order id, **state transition result**, and **latency** — not raw payloads, not secrets.

**Commit reference:** `57983768f6510a97a88414949ca8b585abaf268a`

## Note on `payment_intent.succeeded`

Hosted-checkout **paid** state is driven by **`checkout.session.completed`** in this architecture; `payment_intent.succeeded` remains important for other surfaces (e.g. web top-up) and may still use Express handoff where required.
