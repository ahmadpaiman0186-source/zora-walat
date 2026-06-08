# L-83A — Test plan (implementation phase — not run in design gate)

All tests local, no network, no DB. Proposed new file: `server/test/shadowSafetyGateStagingProbe.test.js`

## Unit tests — adapter

| # | Test | Assert |
|---|------|--------|
| T1 | Gates disabled | `emitStagingProbeShadowDiagnostic` returns null / `{ emitted: false }`, no log |
| T2 | Gates enabled (injected envConfig) | Exactly one `log.info` call |
| T3 | Log payload | `event === 'shadow_safety_gate_webhook_diagnostic'` |
| T4 | Envelope shape | `envelopeVersion === 1`, `diagnosticsOnly === true`, `liveRouteEnforcement === false` |
| T5 | Redaction | Serialized envelope JSON passes L-80 sensitive leak fixtures |
| T6 | Component tag | `component === 'shadow_safety_gate_staging_probe'` |
| T7 | Fixed scenario | `correlationFingerprint` stable for fixed probe context |
| T8 | No fulfillment flag | `wouldScheduleFulfillment === false` in envelope |

## Route tests (supertest or handler injection)

| # | Test | Assert |
|---|------|--------|
| R1 | POST without token | 401 |
| R2 | POST with token, gates off | 404 |
| R3 | POST with token, gates on, empty body | 200, `{ ok: true, emitted: true }` |
| R4 | POST with JSON body | 400 |
| R5 | GET | 405 |

## Regression / boundary tests

| # | Test | Assert |
|---|------|--------|
| B1 | Static import scan | Probe modules do not import fulfillment/prisma/stripe |
| B2 | Webhook hook unchanged | Existing `test:shadow-safety-gate-boundary` still passes |
| B3 | Envelope suite | Existing `test:shadow-safety-diagnostics-envelope` still passes |
| B4 | No-pay-no-service | Probe route not mounted under `/api/payment` or webhook router |

## npm scripts (implementation)

Add:

```json
"test:shadow-safety-gate-staging-probe": "node --test --test-concurrency=1 test/shadowSafetyGateStagingProbe.test.js"
```

Run in CI bundle with existing shadow tests + `secrets:scan`.

## Staging HTTP proof (out of scope for L-83A)

Actual `POST` to staging URL requires **separate** operator L-step after implementation merge + controlled staging deploy approval — **not** this design gate.

---

*End.*
