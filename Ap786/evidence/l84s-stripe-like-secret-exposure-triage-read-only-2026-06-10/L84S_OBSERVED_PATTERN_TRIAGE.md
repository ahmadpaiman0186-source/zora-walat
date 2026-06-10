# L-84S — Observed pattern triage

**Verdict:** `CORE10-L84S-VERDICT-001: L84S_STRIPE_LIKE_SECRET_PATTERN_TRIAGED_READ_ONLY_ROTATION_REQUIRED_SEPARATELY`

## Primary observation (L-84R operator attestation)

| Field | Value |
|-------|--------|
| **Project** | **`zora-walat-api-staging`** |
| **Env field** | **`OPS_HEALTH_TOKEN`** |
| **Scope shown** | **Production** |
| **Observed pattern** | **`sk_live...`-like** (pattern label only) |
| **Observation context** | Vercel env **edit UI field** during L-84R rotation attempt |
| **Full value recorded** | **NO** |
| **Prefix / suffix / hash / length recorded** | **NO** |
| **Screenshot retained** | **NO** |
| **Operator exited without saving today** | **YES** |
| **Clipboard cleared** | **YES** |
| **Local generated token discarded** | **YES** |

## Pattern classification (read-only)

| Assessment | Result |
|------------|--------|
| Pattern consistent with Stripe live secret key family | **YES** — **`sk_live...`-like label only** |
| Pattern observed in correct env var for Stripe keys (`STRIPE_SECRET_KEY`, etc.) | **NO** — observed in **`OPS_HEALTH_TOKEN`** |
| Misplacement / wrong-field risk | **HIGH** — ops infra token field is not a Stripe key slot |
| Deployed production value confirmed as Stripe live key | **NOT PROVEN** — UI observation only; no reveal; no HTTP |
| L-84R save changed deployed value today | **NO** — exited without saving |

## Repository cross-reference (names / patterns only)

| Source | Finding |
|--------|---------|
| [L-84R](../l84r-staging-ops-health-token-rotation-aborted-wrong-secret-2026-06-10/) | Documents **`sk_live...`-like** pattern in **`OPS_HEALTH_TOKEN`** UI field |
| [L-84G](../../ZORA_WALAT_L84G_STAGING_SECRET_PROVISIONING_EXECUTION_2026_06_09.md) | Prior **`OPS_HEALTH_TOKEN`** Vercel UI wrong-value incident (2026-06-09) — discarded, not saved |
| `server/src/middleware/opsInfraHealthGate.js` | **`OPS_HEALTH_TOKEN`** is ops/infra auth — separate from Stripe env vars |
| `server/docs/SECRETS_MANAGEMENT.md` | Documents **`OPS_HEALTH_TOKEN`** as admin/infra gate — not interchangeable with Stripe secrets |
| `secrets:scan` on tracked sources | **OK** — no high-confidence live secret patterns in repository |

## Triage conclusion

Operator-observed **`sk_live...`-like pattern** in the **`OPS_HEALTH_TOKEN`** field on **`zora-walat-api-staging`** is **triaged as a wrong-field Stripe-like secret exposure risk**. **Separate Stripe key rotation approval is required before any Stripe safety claim.** **OPS token clean rotation remains blocked until a separate approved path.**

---

*End.*
