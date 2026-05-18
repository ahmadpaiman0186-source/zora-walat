# L-4 — Stripe webhook resend proof plan (`checkout.session.completed`)

**Purpose:** Prove **idempotent** handling when Stripe **redelivers** the same `checkout.session.completed` event (Dashboard resend or natural retry).  
**Safety:** **Do not execute** Dashboard resend or CLI replay until an owner confirms in writing (chat / ticket).

## Preconditions (read-only)

- [ ] Staging webhook endpoint URL is configured in Stripe Dashboard (test mode) — **do not paste URL or signing secret into Ap786**.
- [ ] Vercel staging deployment includes `57983768f6510a97a88414949ca8b585abaf268a` or later on the money path.
- [ ] Operator has a **valid JWT** and saved `.staging-order-id.local` for the order under test (or use a disposable new checkout after confirmation).

## Baseline capture (no secrets)

Run **before** resend:

```bash
cd server
node tools/staging-auth-checkout-operator.mjs status-check
```

Record **only** safe enums in your ticket: `ORDER_STATUS`, `PAYMENT_STATUS`, `FULFILLMENT_ATTEMPT_COUNT`, `FULFILLMENT_DUPLICATE_SAFE`.

## Stripe Dashboard steps (manual; after confirmation)

1. Stripe Dashboard → **Developers** → **Events**.
2. Filter **Event type** = `checkout.session.completed`.
3. Select the event tied to the **test** session (verify **test mode** toggle).
4. Use **Resend** (or equivalent) to the **staging** webhook endpoint.

**Do not:** copy event JSON into git, chat logs at PII level, or screenshot secrets.

## Post-resend verification

Within ~1 minute:

```bash
cd server
node tools/staging-auth-checkout-operator.mjs status-check
```

**Expected:** Same terminal `ORDER_STATUS` / `PAYMENT_STATUS`; `FULFILLMENT_ATTEMPT_COUNT` unchanged; `FULFILLMENT_DUPLICATE_SAFE` remains **true**.

## Vercel / app logs (sanitized review)

In Vercel log stream, search for structured lines only, e.g.:

- `webhook_slim_checkout_session_completed` (or equivalent schema from slim path)
- `duplicate` / `shadow` / `P2002` class breadcrumbs **without** pasting full payloads

## Stripe CLI alternative (after confirmation)

If Dashboard resend is unavailable, an operator may use Stripe CLI **against test mode** with a **synthetic** signed request — only under runbook that forbids pasting `whsec_` or raw body into evidence. **Ask for confirmation before running.**

## Confirmation gate (mandatory)

> **STOP:** Before any resend or `stripe trigger` / replay, reply **“Approved: L-4 webhook resend on staging”** with date and operator initials.

No automated agent should call Stripe APIs that mutate or replay webhooks without that line.
