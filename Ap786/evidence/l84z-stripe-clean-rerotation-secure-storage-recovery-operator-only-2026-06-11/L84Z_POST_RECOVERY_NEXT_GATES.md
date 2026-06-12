# L-84Z — Post-recovery next gates

**Status:** **AUTHORIZED — OPERATOR EXECUTION PENDING**

**Not authorized by L-84Z.** Separate explicit approval each.

## Required sequence after successful L-84Z (VERDICT-001)

| Step | Gate | Action |
|------|------|--------|
| 1 | **L-84Z** (this gate) | Clean re-rotation + secure storage validation **PASS** |
| 2 | Future | Vercel UI: update **`STRIPE_SECRET_KEY`** from operator secure storage — **no secret to Agent** |
| 3 | Future | Staging redeploy after env save |
| 4 | Future | **`STRIPE_WEBHOOK_SECRET`** — only if webhook signing secret also rotated |
| 5 | Future | **`OPS_HEALTH_TOKEN`** recovery on **`zora-walat-api-staging`** — separate track |
| 6 | Future | **L-84P** authenticated HTTP — **NOT AUTHORIZED** |
| 7 | Future | L-84 reconciliation — **NOT PROVED** |
| 8 | — | **L-74** remains **OPEN** |

## If L-84Z blocked (VERDICT-002)

Do not proceed to Vercel gate until operator resolves storage/rotation failure.

## L-84Z does not authorize

Vercel update, redeploy, HTTP, or L-84P retry — even on success.

---

*End.*
