# Day 1 — `/success` no-504 fix (summary)

## Problem (prior)

After Stripe Checkout, the browser redirected to **`GET /success`**. On serverless staging, that route previously went through the **full Express cold start** (`getHandler()` / bootstrap), causing **Vercel 504 FUNCTION_INVOCATION_TIMEOUT** and a poor payer experience.

## Fix (committed + deployed)

- **`GET /success`** and **`GET /cancel`** are handled on a **slim path** in the Vercel entry (`server/api/index.mjs`) before full app bootstrap.
- Handler serves **small static HTML** with **no full Stripe session id or internal order id** echoed in the page body (suffix-style display only in implementation; this evidence file stores no identifiers).

## Result

- Return page responds in **sub-second to low-second** range on staging probes (not a formal SLO; see ops monitoring for production).
- **No 504** on successful return after payment in verified milestone.

**Commit reference:** `57983768f6510a97a88414949ca8b585abaf268a`
