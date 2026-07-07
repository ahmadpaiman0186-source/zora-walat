# ZORA-WALAT ENV & INFRASTRUCTURE AUDIT — 2026-07-07

## Staging vs production boundary

| Dimension | Staging (`zora-walat-api-staging`) | Production API (`zora-walat-api`) |
|-----------|-------------------------------------|-----------------------------------|
| Vercel env label | **Production** (alias only) | **Production** |
| Business production | **NO** — staging tier | Scoped proofs only (L-86D) |
| `ZW_API_DEPLOYMENT_TIER` | `staging` (per L-90B evidence) | Unknown without live pull |
| Stripe keys | Test (`ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION`) | **NOT PROVEN** live |
| Airtime provider runtime | **mock** (L-89B B2B proof) | **UNKNOWN** |
| Reloadly cred env names | **Absent** on staging Vercel (L-90B2) | **UNKNOWN** |

## Environment variable dependency map (names only)

### Critical money path

| Variable | Purpose | Staging (name present) | Production |
|----------|---------|------------------------|------------|
| `DATABASE_URL` | Primary DB | Yes | Yes (encrypted) |
| `READ_ONLY_DATABASE_URL` | Read-only role proof | Yes | **UNKNOWN** |
| `STRIPE_SECRET_KEY` | Stripe API | Yes | **UNKNOWN** mode |
| `STRIPE_WEBHOOK_SECRET` | Webhook verify | Yes | **UNKNOWN** |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Auth | Yes | Yes |
| `OPS_HEALTH_TOKEN` | Ops/ready gates | Yes | Yes |
| `PRELAUNCH_LOCKDOWN` | Money block | Yes | Yes |
| `AIRTIME_PROVIDER` | Fulfillment adapter | Yes | **UNKNOWN** value |
| `RELOADLY_SANDBOX` | Provider audience | Yes | **UNKNOWN** |
| `RELOADLY_CLIENT_ID` / `RELOADLY_CLIENT_SECRET` | Provider auth | **NO** (staging) | **UNKNOWN** |
| `RELOADLY_OPERATOR_MAP_JSON` | Operator map | **NO** (staging) | **UNKNOWN** |
| `PHASE1_FULFILLMENT_OUTBOUND_ENABLED` | Outbound gate | **NO** (staging) | **UNKNOWN** |
| `PHASE1_WEBHOOK_SKIP_FULFILLMENT_DISPATCH` | Dispatch skip | Yes (=true L-89B) | **UNKNOWN** |
| `ALLOW_MOCK_AIRTIME_IN_PRODUCTION` | Mock in prod NODE_ENV | Yes | Yes |
| `STAGING_ALLOW_STRIPE_TEST_PAYMENT` | Staging checkout | Yes | N/A |
| `DEV_CHECKOUT_AUTH_BYPASS` | **DANGEROUS** if true in prod | Yes (name) | Must be false |

### Infrastructure optional

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Rate limits / queues |
| `RATE_LIMIT_USE_REDIS` | Shared rate limits |
| `FULFILLMENT_QUEUE_ENABLED` | BullMQ worker path |
| `CORS_ORIGINS`, `CLIENT_URL` | CORS + return URLs |
| `SHADOW_SAFETY_GATE_*` | Diagnostics only |

**Source:** `server/src/config/env.js` (~101 `process.env` references), L-90B2 `vercel env ls` (read-only, 2026-06-25).

## Missing environment variables (staging — proven)

- `RELOADLY_CLIENT_ID`
- `RELOADLY_CLIENT_SECRET`
- `RELOADLY_OPERATOR_MAP_JSON`
- `PHASE1_FULFILLMENT_OUTBOUND_ENABLED` (explicit false recommended)

## Unsafe environment assumptions

| Assumption | Risk | Mitigation in code |
|------------|------|-------------------|
| Vercel "Production" label = business production | **HIGH** misread | Program uses NON_CLAIMS + tier gates |
| `NODE_ENV=production` on staging | Mock requires `ALLOW_MOCK_*` | `productionSafetyGates.js` |
| `AIRTIME_PROVIDER=reloadly` without creds | Fatal startup | `validateAirtimeReloadlyConfigOrExit` |
| Outbound defaults false | Reloadly HTTP blocked | `fulfillmentOutboundPolicy.js` |
| Personal Stripe bank (operator fact L-90C1A) | Not entity-aligned | **BLOCKED** for real money |

## Server config findings

| Finding | Path | Status |
|---------|------|--------|
| Prisma schema valid | `npm run db:validate` | **PASS** (2026-07-07 local) |
| Secrets scan clean (tracked) | `npm run secrets:scan` | **PASS** (2026-07-07) |
| Bootstrap env validation | `server/bootstrap.js` | Fails loud on missing Stripe in dev |
| Log redaction | `phase1ObservabilitySanitize.js` | **IMPLEMENTED** |
| Restricted regions | `restrictedRegions.js` + middleware | **IMPLEMENTED** — external legal review **NOT PROVEN** |

## Endpoints exposing sensitive data (risk review)

| Route | Risk | Mitigation |
|-------|------|------------|
| `/ops/db-readonly-proof` | DB identity metadata | Token-gated; sanitized output |
| `/api/admin/support/order/:id/full-trace` | Order PII | Staff JWT |
| `/internal/logs/webtopup` | Logs | Token-gated |
| `/metrics` | Ops metrics | Token + flag |

**No evidence** of DATABASE_URL or raw secrets in JSON responses from code review; runtime leak **NOT PROVEN** absent.

## Unauthenticated mutation surfaces (review)

| Route | Mutation | Gate |
|-------|----------|------|
| `POST /webhooks/stripe` | Payment state | Signature required |
| `POST /api/auth/register` | User create | Prelaunch block possible |
| `POST /api/topup-orders/:id/mark-paid` | **HIGH** if open | Auth required — verify route |
| Admin replay/dispatch | Fulfillment | Staff/admin |

## Deployment proof status

| Claim | Evidence | Status |
|-------|----------|--------|
| Staging API deploys | L-85M, L-89B deploy IDs | **PARTIAL** — specific deploys only |
| Production API deploys | L-86C, L-86D | **PARTIAL** — readonly route only |
| Full stack healthy | — | **NOT PROVEN** |
| CI green on main | `.github/workflows/ci.yml` | **UNKNOWN** — not re-run this audit |

---

*No env values printed. No Vercel mutation performed.*
