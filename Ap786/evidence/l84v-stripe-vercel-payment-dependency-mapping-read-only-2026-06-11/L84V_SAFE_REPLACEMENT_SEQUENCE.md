# L-84V — Safe replacement sequence

**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

**Plan only — not authorized in L-84V.**

## Ordered gates (each requires separate explicit approval)

| Step | Gate | Action | Proof required |
|------|------|--------|----------------|
| 1 | **L-84V** (this) | Dependency map read-only | Ap786 map artifacts |
| 2 | Future | Operator confirms blast-radius acceptance + secure storage | Non-secret attestation |
| 3 | Future | Stripe Dashboard: roll/revoke **live** secret key | Operator-only; no secret in evidence |
| 4 | Future | Store new key in operator secure storage | Non-secret attestation |
| 5 | Future | Vercel UI: update **`STRIPE_SECRET_KEY`** on **correct project(s)** only | Save attestation; no values |
| 6 | Future (if webhook secret changes) | Stripe Dashboard webhook endpoint + Vercel **`STRIPE_WEBHOOK_SECRET`** | Paired update proof |
| 7 | Future | **`OPS_HEALTH_TOKEN`** clean recovery on **`zora-walat-api-staging`** | Separate from Stripe vars |
| 8 | Future | Staging redeploy (`zora-walat-api-staging`) | Deployment ID — L-84O pattern |
| 9 | Future | **L-84P** authenticated `GET /ops/health` | HTTP proof gate |
| 10 | Future | L-84 retry / payment proof | **Not authorized by L-84V** |

## Rules during Stripe key replacement

| Rule | Rationale |
|------|-----------|
| Never paste Stripe secret into **`OPS_HEALTH_TOKEN`** | L-84R/L-84S wrong-field incident |
| Update Vercel **before** or **immediately after** revoke window | Minimize checkout/webhook outage |
| Do not redeploy before env save confirmed | Running deployment won't load new env |
| Clipboard clear after each save | No secret in chat/repo |

## Parallel vs sequential

| Track | May parallel? |
|-------|---------------|
| Stripe **`STRIPE_SECRET_KEY`** rotation | Sequential with Vercel update on same project |
| **`OPS_HEALTH_TOKEN`** recovery | **Parallel** if different env var — **must not** use Stripe key material |
| **`STRIPE_WEBHOOK_SECRET`** | **After** Stripe endpoint secret known — paired update |

---

*End.*
