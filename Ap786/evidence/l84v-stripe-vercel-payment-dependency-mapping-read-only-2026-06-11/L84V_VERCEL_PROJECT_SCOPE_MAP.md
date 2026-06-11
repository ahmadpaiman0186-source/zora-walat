# L-84V — Vercel project and scope map

**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

**Project names from Ap786 evidence and repo docs only.** **No Vercel env values read in L-84V.**

## Known Vercel projects (name-level)

| Project | Evidence source | Likely server Stripe env vars | Ops token |
|---------|-----------------|------------------------------|-----------|
| **`zora-walat-api-staging`** | L-84B–L-84R, STR02 webhook docs | **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`** (names only) | **`OPS_HEALTH_TOKEN`** — L-84N provisioned; L-84R UI incident |
| **`zora-walat-api`** | L-84G no-touch attestation; L-85A preview failure doc | Same server env **names** — production API | Not primary L-84 staging track |
| **`zora-walat`** / **`zora-walat-mj41`** | L-84 gates forbidden list | **Not mapped in L-84V** — out of scope for staging ops track |

## Frontend project (partial lock)

| Surface | Env name | Project lock |
|---------|----------|--------------|
| Next/client | **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** | **NOT LOCKED** in L-84J/L-84V — separate from API server |

## Scope terminology (Vercel)

| Term in Ap786 | Meaning |
|---------------|---------|
| **Production** scope on **`zora-walat-api-staging`** | Vercel env scope label for staging API deployment — **not** production business launch |

## Staging webhook endpoint (documented)

| Field | Value |
|-------|-------|
| Host | `zora-walat-api-staging.vercel.app` |
| Path | `/webhooks/stripe` |
| Stripe Dashboard pairing | **UNKNOWN** — endpoint ID / signing secret not verified in L-84V |

## Unknown dependencies (block rotation certainty)

| # | Unknown |
|---|---------|
| 1 | Live vs test **`STRIPE_SECRET_KEY`** on each Vercel project |
| 2 | Whether staging and production share Stripe live account |
| 3 | Active webhook endpoints per Stripe mode |
| 4 | Whether deployed **`OPS_HEALTH_TOKEN`** contains Stripe material (vs UI-only observation) |

---

*End.*
