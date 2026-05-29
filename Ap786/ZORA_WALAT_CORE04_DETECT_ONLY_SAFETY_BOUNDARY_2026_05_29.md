# CORE-04 Detect-Only Safety Boundary

**Date:** 2026-05-29  
**Status:** **ENFORCED IN CODE PATH (v1)**

---

## 1. Hard prohibitions

| Action | CORE-04 v1 |
|--------|------------|
| Reloadly / Stripe / Vercel / provider HTTP | **FORBIDDEN** |
| DB read/write in `reliability` CLI mode | **FORBIDDEN** (fixture-only) |
| Payment capture / refund | **FORBIDDEN** |
| Wallet credit/debit | **FORBIDDEN** |
| Order status mutation | **FORBIDDEN** |
| Provider POST / retry | **FORBIDDEN** |
| Webhook replay/resend | **FORBIDDEN** |
| Auto-repair apply (`--apply`) | **FORBIDDEN** (exit 2) |
| Env / secret file edits | **OUT OF SCOPE** |
| Deploy / production config change | **OUT OF SCOPE** |

---

## 2. Fail-closed rules

| Condition | Behavior |
|-----------|----------|
| Missing snapshot fields | Conservative finding (e.g. stale check without timestamp) |
| Ambiguous provider on FULFILLED | Critical finding; **never** treat as healthy |
| Empty fixture path in CLI | Exit 2 + error JSON |
| Unknown snapshot shape | Normalize to empty orders (may PASS vacuously — supply explicit fixtures) |

---

## 3. `mutationAllowed` contract

Every finding from `createFinding()` sets `mutationAllowed: false`. Tests assert this for Class D findings.

---

## 4. Separation from existing money paths

CORE-04 modules are **isolated** under `server/src/reliability/runtimeDoctor/`. No imports from:

- `stripeWebhook.routes.js`
- `paymentController.js`
- `reloadlyClient.js` (runtime POST paths)

Existing checkout/webhook/provider flows are **unchanged**.

---

## 5. Future DB-backed scan (not v1)

A future version may accept **operator-supplied read-only snapshots** exported from DB. That requires separate DR and is **NOT ENABLED**.

---

*End of safety boundary.*
