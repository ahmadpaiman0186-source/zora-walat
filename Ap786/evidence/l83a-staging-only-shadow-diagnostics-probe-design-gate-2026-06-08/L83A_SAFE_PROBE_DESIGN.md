# L-83A — Safe probe design

## Objective

Design a path that emits **exactly one** sanitized observability log line per authorized probe invocation:

```json
{
  "event": "shadow_safety_gate_webhook_diagnostic",
  "envelope": { "...": "L-80 sanitized envelope v1" }
}
```

Without: Stripe replay, payment, checkout, order creation, provider call, DB write, fulfillment scheduling, wallet/credit movement, or production exposure.

## Candidate route (not implemented)

```
POST /internal/staging/shadow-safety-gate/diagnostic-probe
```

Mount under existing `/internal` prefix in `app.js` (same pattern as `internalWebtopupLogs.routes.js`), with `apiIpLimiter`.

## Architecture options evaluated

| Option | Description | Safety |
|--------|-------------|--------|
| A | Route calls `buildSanitizedShadowDiagnosticsEnvelope` directly with synthetic report | Medium — skips gate evaluation parity with webhook path |
| B | **New isolated adapter** calls `evaluateShadowSafetyGate` + envelope builder | **Highest — recommended** |
| C | Extract/refactor `maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary` | Lower — touches L-79/L-80 webhook hook; regression risk |

### Recommendation: Option B — isolated diagnostic adapter

**New module (implementation phase):** `server/src/reliability/shadowSafetyGate/stagingProbeDiagnostics.js`

**Responsibilities:**

1. Export `STAGING_PROBE_FIXED_SCENARIO` — frozen synthetic `ShadowWebhookFulfillmentContext` (fixture-shaped, no HTTP input). Use deterministic IDs prefixed `l83a_probe_` (not real order/Stripe IDs).
2. Export `emitStagingProbeShadowDiagnostic({ log, envConfig })`:
   - Fail closed unless all gates pass (see gating doc).
   - `evaluateShadowSafetyGate(STAGING_PROBE_FIXED_SCENARIO)` — pure, no I/O.
   - `buildSanitizedShadowDiagnosticsEnvelope({ report, shadowModeEnabled: true, component: 'shadow_safety_gate_staging_probe', correlationMaterial: { orderId: 'l83a_probe', eventType: 'staging_probe', eventId: 'l83a_probe_run' } })`.
   - Log via `log.info({ event: 'shadow_safety_gate_webhook_diagnostic', envelope: serializeSanitizedEnvelopeForLog(envelope) }, ...)`.
   - Return `{ ok: true, emitted: true, correlationFingerprint }` — **no report secrets, no raw gate internals**.

**Route handler (implementation phase):** thin wrapper only — auth gate → env gate → call adapter → JSON response.

**Why not reuse `maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary`:**

- Accepts `event`, `orderId`, `session` shaped like Stripe webhook post-commit data.
- Name and parameter contract imply webhook boundary semantics.
- Risk of future caller passing real webhook-shaped bodies from HTTP.

**Why not Option A alone:**

- Envelope without `evaluateShadowSafetyGate` weakens proof that diagnostics reflect gate logic used at webhook boundary.

**Why not Option C:**

- Refactoring shared webhook hook for staging probe couples money-path module to probe feature; violates minimal-change principle.

## Request / response contract (design)

| Field | Rule |
|-------|------|
| Request body | **Empty or ignored** — reject non-empty JSON with 400 |
| Query params | None required |
| Response | `{ ok: true, emitted: true, probeId: "l83a_staging_probe_v1", correlationFingerprint: "<16 hex>" }` |
| Response | Must not include envelope verbatim (log sink is observability; HTTP response stays minimal) |
| Idempotency | Each POST emits one log line (operator controls frequency) |

## Code inspection anchors (read-only)

| File | Relevance |
|------|-----------|
| `server/src/routes/stripeWebhook.routes.js` | Current only call sites for webhook hook (~559, ~682); fulfillment follows |
| `server/src/reliability/shadowSafetyGate/webhookBoundaryHook.js` | Flag-gated emit pattern to mirror in adapter |
| `server/src/reliability/shadowSafetyGate/sanitizedDiagnosticsEnvelope.js` | L-80 envelope builder — reuse as-is |
| `server/src/config/env.js` | `shadowSafetyGateWebhookDiagnosticsEnabled` — separate new probe flag required |
| `server/src/app.js` | `/internal` mount pattern |
| `server/src/routes/internalWebtopupLogs.routes.js` | Token gate pattern (`opsInfraHealthTokenMatches`) |
| `server/test/shadowSafetyDiagnosticsEnvelope.test.js` | Redaction / envelope test patterns to extend |

## Separate env flag (design)

Do **not** overload `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` for the probe route.

Proposed (implementation):

- `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` — `=== 'true'` only on `zora-walat-api-staging`
- `ZW_API_DEPLOYMENT_TIER` — must be `staging` when probe enabled (fail closed if mismatch)

Webhook diagnostics flag remains independent (L-82 evidence).

---

*End.*
