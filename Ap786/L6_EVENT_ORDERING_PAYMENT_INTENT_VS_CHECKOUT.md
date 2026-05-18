# L-6 — Event ordering safety plan (`payment_intent.succeeded` vs `checkout.session.completed`)

**Purpose:** Document **ordering** and **authority** so out-of-order Stripe delivery does not leave money-path state inconsistent.

## Architecture fact (from existing Ap786 + code intent)

- **Hosted Checkout (Phase 1 mobile top-up):** **`checkout.session.completed`** is the **authoritative** event for transitioning the `PaymentCheckout` row to **PAID** and kicking fulfillment scheduling (see `DAY1_WEBHOOK_SLIM_PATH.md` and `phase1StripeCheckoutSessionCompleted.js` in repo).
- **`payment_intent.succeeded`:** Used heavily for **embedded / web top-up** flows (`tw_ord_*` metadata, `metadata.source` gate in slim layer). For hosted checkout, it may arrive **before or after** `checkout.session.completed`; **paid DB state must not depend solely on PI** for that product surface.

## Ordering scenarios (planning)

| Order of arrival | Expected safe behavior |
|------------------|------------------------|
| `checkout.session.completed` first | PAID persisted; PI later may fee-capture / metrics paths without changing lifecycle incorrectly |
| `payment_intent.succeeded` first | Slim path may fast-ack or hand off per metadata; **PAID** still established when `checkout.session.completed` arrives with valid truth |
| Only PI, never checkout completed | **Stuck / unpaid** in hosted model — operational alert; not fixed by Ap786 text (runbook: investigate session, Stripe Dashboard) |

## Proof plan (no execution here)

1. **Desk:** Confirm in code review that `applyPhase1CheckoutSessionCompleted` truth checks bind session ↔ DB row (session id, amount, metadata).
2. **Optional lab (after approval):** Stripe test clock or scripted fixtures **without** logging raw payloads — compare only **state enums** from `status-check` across delayed deliveries.

## Logging rules (L-6 runs)

- Allowed: event **type**, id **suffixes**, transition **result**, **latency**.
- Forbidden: raw JSON, `whsec_`, PII, full `pi_` / `cs_` strings in evidence packs.

## Confirmation gate

> **STOP:** Any scripted multi-event replay needs **“Approved: L-6 ordering proof on staging”**.
