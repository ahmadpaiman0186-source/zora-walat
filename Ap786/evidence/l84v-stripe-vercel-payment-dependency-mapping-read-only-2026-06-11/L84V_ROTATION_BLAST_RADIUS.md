# L-84V — Rotation blast radius

**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

Theoretical blast radius from code + name-level mapping. **Live deployment state not verified.**

## `STRIPE_SECRET_KEY` rotation / revocation

| Consumer | Impact if key revoked before Vercel update |
|----------|---------------------------------------------|
| `getStripeClient()` | All Stripe API calls fail |
| `POST /create-checkout-session` | Checkout creation fails — **no new paid sessions** |
| Webhook handler enrichment | May fail PI/session lookups |
| `webtopupStripeFallbackPoller` | Fallback payment verification fails |
| Preflight scripts | Readiness checks fail |

**Coupling:** Any Vercel project / local env using the old key until updated and redeployed.

## `STRIPE_WEBHOOK_SECRET` rotation

| Consumer | Impact |
|----------|--------|
| `POST /webhooks/stripe` signature verification | **All webhooks rejected** until Vercel + Stripe endpoint secret aligned |
| Order fulfillment via webhook | **Stalled** — paid events not processed |
| Idempotency table | Events may retry from Stripe |

**Coupling:** Stripe Dashboard webhook endpoint signing secret must match **`STRIPE_WEBHOOK_SECRET`** on each deployed API instance.

## `OPS_HEALTH_TOKEN` (separate — L-84 track)

| Consumer | Impact |
|----------|--------|
| `GET /ops/health`, `/ready` detail gates | Auth failure — **not payment path** |
| Wrong `sk_live...`-like in field (L-84R) | Ops auth misconfiguration risk — **separate from Stripe SDK env** |

**Important:** Rotating **`STRIPE_SECRET_KEY`** does **not** fix **`OPS_HEALTH_TOKEN`**. OPS recovery remains a **separate gate**.

## Cross-project blast radius (unknown magnitude)

| Risk | Assessment |
|------|------------|
| Same live key on staging + production Vercel projects | **POSSIBLE — NOT PROVEN** |
| Revoke live key in Dashboard | **May break all deployments using that key** |
| Frontend `pk_*` mismatch after secret rotation | Checkout UI may fail if publishable/secret mode diverges |

## Why L-84U aborted

Operator could not confirm which of the above paths would break **immediately** on revoke. L-84V maps paths but **does not eliminate** that uncertainty without deployment-state proof.

---

*End.*
