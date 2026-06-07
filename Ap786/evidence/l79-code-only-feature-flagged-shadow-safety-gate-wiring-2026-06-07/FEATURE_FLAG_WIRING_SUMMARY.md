# L-79 — Feature-flag wiring summary

**Flag:** `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED`
**Env field:** `env.shadowSafetyGateWebhookDiagnosticsEnabled`
**Default:** **false** (absent env → disabled)

## Code changes

| File | Change |
|------|--------|
| `server/src/config/env.js` | Flag definition |
| `server/src/reliability/shadowSafetyGate/webhookBoundaryHook.js` | Boundary hook |
| `server/src/routes/stripeWebhook.routes.js` | Hook before `scheduleFulfillmentProcessing` (2 anchors) |
| `server/test/shadowSafetyGateBoundary.test.js` | 11 boundary tests |

## Behavior

| Flag | Behavior |
|------|----------|
| absent / false | `maybeEmit…` returns **null** — zero effect |
| true | Shadow diagnostics logged — **no block**, **no dispatch change** |

---

*End.*
