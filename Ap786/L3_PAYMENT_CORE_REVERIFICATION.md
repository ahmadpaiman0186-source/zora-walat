# L-3 — Payment core re-verification (evidence-only, no new payment)

**Status:** Complete as a **desk re-verification** from repo-canonical Ap786 Day 1 documents and known commit history.  
**Constraint:** No new Stripe checkout or card charge was run for this summary.

## Sources (existing evidence only)

| Source | What it establishes |
|--------|---------------------|
| `DAY1_STATUS_CHECK_FINAL.md` | Terminal `ORDER_STATUS`, `PAYMENT_STATUS`, `PAID_CONFIRMED`, fulfillment attempt count, duplicate-safe flag |
| `DAY1_PAYMENT_TO_FULFILLMENT_PASS.md` | Narrative chain: checkout → pay → return → webhook → paid → fulfilled |
| `DAY1_WEBHOOK_SLIM_PATH.md` | `checkout.session.completed` processed on slim path after signature verify; same domain transition as Express |
| `DAY1_SUCCESS_ROUTE_FIX.md` | `/success` no longer blocked by cold bootstrap (504 eliminated) |
| `DAY1_COMMIT_AND_DEPLOY_SUMMARY.md` | Staging URL + SHAs `014f666ab324097db11a45c94e479e6aebaaf337`, `57983768f6510a97a88414949ca8b585abaf268a` |

## Re-stated verified outcome (sanitized flags)

From prior operator evidence (no ids recorded here):

- `ORDER_STATUS` = **FULFILLED**
- `PAYMENT_STATUS` = **RECHARGE_COMPLETED**
- `PAID_CONFIRMED` = **true**
- `FULFILLMENT_ATTEMPT_COUNT` = **1**
- `FULFILLMENT_DUPLICATE_SAFE` = **true**

## Payment core contract (architecture, evidence-aligned)

1. **Hosted checkout paid persistence** is driven by **`checkout.session.completed`** with internal checkout correlation (see `DAY1_WEBHOOK_SLIM_PATH.md`).
2. **Return UX** is decoupled from webhook completion timing via slim `/success` (see `DAY1_SUCCESS_ROUTE_FIX.md`).
3. **Read path** for operators uses authenticated slim or legacy order APIs per `014f666…` tooling (see `L1_RELEASE_CONTROL_REPORT.md`).

## When a *new* payment would be needed

Only if regression is suspected after a deploy or env change. Then follow `L4_STRIPE_WEBHOOK_RESEND_PLAN.md` / operator runbook with **explicit confirmation** before any live Stripe action.

## Optional read-only re-check (no Stripe mutation)

From `server/` after valid local token + saved order id (if still present):

```bash
node tools/staging-auth-checkout-operator.mjs status-check
```

Expect the same enum flags as above for an unchanged successful order. **Do not** open Checkout or pay again unless L-4/L-5 proof requires a fresh session (and you have confirmation).
