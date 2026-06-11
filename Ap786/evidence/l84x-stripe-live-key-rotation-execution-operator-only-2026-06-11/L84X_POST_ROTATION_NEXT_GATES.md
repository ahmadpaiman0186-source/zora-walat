# L-84X — Post-rotation next gates

**Verdict:** `CORE10-L84X-VERDICT-001: L84X_STRIPE_LIVE_KEY_ROTATION_OPERATOR_COMPLETED_NO_SECRET_REVEAL_VERCEL_UNCHANGED`

**Not authorized by L-84X.** Separate explicit approval each.

## Required sequence after L-84X

| Step | Gate | Action |
|------|------|--------|
| 1 | **L-84X** (complete) | Stripe Dashboard rotation + DPAPI storage |
| 2 | Future | Vercel UI: update **`STRIPE_SECRET_KEY`** on correct project(s) from operator secure storage — **no secret to Agent** |
| 3 | Future (if needed) | **`STRIPE_WEBHOOK_SECRET`** paired update — only if webhook signing secret also rotated |
| 4 | Future | **`OPS_HEALTH_TOKEN`** clean recovery on **`zora-walat-api-staging`** — separate from Stripe vars |
| 5 | Future | Staging redeploy after env saves |
| 6 | Future | **L-84P** authenticated `GET /ops/health` — **NOT AUTHORIZED** |
| 7 | Future | L-84 reconciliation — **NOT PROVED** |
| 8 | — | **L-74** remains **OPEN** |

## Operator storage note

New live secret is in **DPAPI encrypted storage outside repo** (operator attestation). Future Vercel gate must paste from operator-controlled storage only — never into chat/evidence.

## L-84X does not authorize

Vercel update, redeploy, HTTP, or L-84P retry.

---

*End.*
