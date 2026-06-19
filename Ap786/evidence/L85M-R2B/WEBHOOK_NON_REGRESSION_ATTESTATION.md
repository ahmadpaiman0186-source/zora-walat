# L-85M-R2B — Webhook non-regression attestation

**Gate UTC:** 2026-06-19

---

## Stripe webhook mapping

| Check | Result |
|-------|--------|
| `vercel.json` `/webhooks/stripe` rewrite | **Unchanged** |
| `api/webhooks/stripe.mjs` | **Unchanged** (no diff in this gate) |
| Stripe slim handler import path | **Unchanged** |
| POST-only webhook contract | **Unchanged** |

## Isolation rationale

- Ops rewrites target **distinct paths** (`/ops/db-readonly-proof`, `/ops/health`).
- No `/ops/(.*)` catch-all that could intercept webhook traffic.
- Webhook rewrite remains first in list; ops rewrites appended at end.
- Root bridge files are separate serverless functions under `api/ops/`, not shared with `api/webhooks/stripe`.

## Payment / provider behavior

No payment, Stripe signature verification, or provider runtime logic was modified in this gate.

---

*End.*
