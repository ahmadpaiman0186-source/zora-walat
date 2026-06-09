# L-84J — Repository Stripe env variable inventory (names only)

**Verdict:** `CORE10-L84J-VERDICT-002: L84J_STRIPE_ROTATION_PREFLIGHT_BLOCKED_TARGET_LOCK_INCOMPLETE`

**No values recorded.** Local repository inspection only.

## Backend / server (primary runtime)

| Env variable name | Referenced in (examples) | Role (name-level) |
|-------------------|--------------------------|-------------------|
| `STRIPE_SECRET_KEY` | `server/src/config/stripeEnv.js`, `server/bootstrap.js`, `server/scripts/gate-check.mjs`, `server/.env.production.example`, `server/.env.local.example` | Stripe API secret / restricted key |
| `STRIPE_WEBHOOK_SECRET` | `server/src/config/env.js`, `server/api/slimStripeWebhookHandler.mjs`, `server/bootstrap.js`, `server/.env.production.example` | Webhook signing secret (`whsec_` family) |
| `STRIPE_PUBLISHABLE_KEY` | `server/.env.production.example`, `server/src/config/stripeLiveReadinessPreflight.js` | Optional server-side publishable key alignment |
| `STRIPE_SECRET_KEY_INTEGRATION` | `server/.env.local.example`, `server/test/integrations/testDatabaseResolution.mjs` | Integration-test override only |

## Frontend / client (separate surface)

| Env variable name | Referenced in (examples) | Role (name-level) |
|-------------------|--------------------------|-------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env.local.example`, `README.md`, `scripts/aes-internal.mjs` | Client publishable key (`pk_` family) |

## Documentation cross-ref (names only)

| Source | Names listed |
|--------|--------------|
| `server/docs/SECRETS_MANAGEMENT.md` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_PUBLISHABLE_KEY` |

## Not Stripe (L-84 context — do not rotate under Stripe preflight)

| Env variable name | Notes |
|-------------------|-------|
| `OPS_HEALTH_TOKEN` | Ops/infra gate — L-84G target; **not provisioned** |
| `OPS_INFRA_HEALTH_TOKEN` | Alias documented in `server/src/middleware/opsInfraHealthGate.js` |

---

*End.*
