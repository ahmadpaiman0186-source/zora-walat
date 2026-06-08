# L-83A — Route gating and fail-closed model

All gates must pass before adapter runs. **Default: route behaves as if it does not exist.**

## Gate stack (ordered)

| # | Gate | Fail-closed behavior |
|---|------|----------------------|
| G1 | `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED !== 'true'` | **404** `{ ok: false, error: 'not_found' }` |
| G2 | `ZW_API_DEPLOYMENT_TIER !== 'staging'` | **404** (same — do not reveal staging-only surface on prod) |
| G3 | `env.nodeEnv === 'production'` **and** G2 fails | **404** — Vercel staging often uses `NODE_ENV=production`; tier env is authoritative |
| G4 | `opsInfraHealthTokenMatches(req)` false | **401** `{ ok: false, error: 'unauthorized' }` |
| G5 | Non-empty request body | **400** `{ ok: false, error: 'body_not_allowed' }` |
| G6 | Wrong HTTP method (not POST) | **405** |

## Auth model

Reuse existing ops token pattern from `internalWebtopupLogs.routes.js`:

- `Authorization: Bearer <OPS_HEALTH_TOKEN>` or `X-ZW-Ops-Token`
- Token length ≥ 16 (existing helper)

No new shared secret type in design gate. Implementation may document reuse of `OPS_HEALTH_TOKEN` on staging only.

## Production availability

| Surface | Production (`zora-walat-api`) | Staging (`zora-walat-api-staging`) |
|---------|------------------------------|-------------------------------------|
| Probe route registered | May exist in code but **G1/G2 fail closed → 404** | Enabled only when operator sets both env flags |
| Webhook diagnostics flag (L-82) | Must remain **false/unset** | May remain true independently |

**Design rule:** absence of env flags must equal **no probe behavior**, not degraded probe.

## Rate limiting

Inherit `apiIpLimiter` on `/internal` mount (existing `app.js` pattern).

## Logging

- Emit **one** structured info log per successful probe via adapter.
- Do not log ops token, request headers, or client IP in envelope.
- Optional route-level debug: `{ event: 'l83a_staging_probe_invoked', emitted: true }` without sensitive fields.

## Fail-closed stop conditions (design)

Stop implementation design review if any proposed variant:

- Enables probe when `ZW_API_DEPLOYMENT_TIER` unset on a production-labeled project
- Accepts Stripe event JSON in request body
- Calls `scheduleFulfillmentProcessing`, Prisma, Stripe SDK, or provider adapters
- Registers route outside `/internal` or without token gate

---

*End.*
