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

> **Historical:** Original gate required **“Approved: L-4 webhook resend on staging”**.  
> **2026-05-18:** Operator approval received in chat to proceed with L-4 + L-5 Dashboard resend proof (no new checkout/payment). Execution record appended below.

No automated agent should call Stripe APIs that mutate or replay webhooks without that line.

---

## Execution record — L-4 / L-5 (approved operator session)

**Approval received (chat):** Proceed with L-4 and L-5 manual Stripe Dashboard `checkout.session.completed` resend proof — **no new checkout**, **no new payment**.

### Reference steady state (Day 1 milestone, prior evidence)

From `DAY1_STATUS_CHECK_FINAL.md` (sanitized enums only; not re-measured in this runner):

| Field | Historical verified value |
|-------|---------------------------|
| `STATUS_CHECK_HTTP` | `200` |
| `ORDER_FOUND` | `true` |
| `ORDER_STATUS` | `FULFILLED` |
| `PAYMENT_STATUS` | `RECHARGE_COMPLETED` |
| `PAID_CONFIRMED` | `true` |
| `FULFILLMENT_ATTEMPT_COUNT` | `1` |
| `FULFILLMENT_DUPLICATE_SAFE` | `true` |

After a successful **Dashboard resend** of the **same** event, these enums should remain **unchanged** (duplicate-safe readout).

### Automated agent capture (this CI/agent run — pre-resend)

| Field | Value |
|-------|-------|
| `STATUS_CHECK_HTTP` | `401` |
| `ORDER_FOUND` | `unknown` |
| `ORDER_STATUS` | *(not loaded — auth failure)* |
| `PAYMENT_STATUS` | *(not loaded — auth failure)* |
| `PAID_CONFIRMED` | *(not loaded — auth failure)* |
| `FULFILLMENT_ATTEMPT_COUNT` | *(not loaded — auth failure)* |
| `FULFILLMENT_DUPLICATE_SAFE` | *(not loaded — auth failure)* |
| `LOCAL_ERROR` | `auth_token_invalid_or_denied` |
| `LOCAL_ORDER_ID_PREVIEW` | `…04pvq0dr78` (suffix only; file present) |

**Cause:** Saved order id file exists; **JWT** in `.staging-token.local` is **invalid/expired** in this environment (`STAGING_OPERATOR_PASSWORD` not set — non-interactive `login` unavailable). Fulfillment enums require operator `login` first.

### Operator — exact commands (before / after resend)

```bash
cd server
node tools/staging-auth-checkout-operator.mjs login
node tools/staging-auth-checkout-operator.mjs status-check
```

Perform **Stripe Dashboard (test mode)** → **Events** → `checkout.session.completed` → **Resend** to staging webhook for the **existing** event (no new payment).

```bash
node tools/staging-auth-checkout-operator.mjs status-check
```

### Operator-fill — before resend (enums only; after `login`)

| Field | Value |
|-------|-------|
| `STATUS_CHECK_HTTP` | *(operator)* |
| `ORDER_FOUND` | *(operator)* |
| `ORDER_STATUS` | *(operator)* |
| `PAYMENT_STATUS` | *(operator)* |
| `PAID_CONFIRMED` | *(operator)* |
| `FULFILLMENT_ATTEMPT_COUNT` | *(operator)* |
| `FULFILLMENT_DUPLICATE_SAFE` | *(operator)* |

### Operator-fill — after Dashboard resend (enums only)

| Field | Value |
|-------|-------|
| `STATUS_CHECK_HTTP` | *(operator)* |
| `ORDER_FOUND` | *(operator)* |
| `ORDER_STATUS` | *(operator)* |
| `PAYMENT_STATUS` | *(operator)* |
| `PAID_CONFIRMED` | *(operator)* |
| `FULFILLMENT_ATTEMPT_COUNT` | *(operator)* |
| `FULFILLMENT_DUPLICATE_SAFE` | *(operator)* |

**Next commit:** Paste completed operator tables into this section (or append dated row) — still **no** secrets, payloads, or full ids.
