# L-81 — Default OFF production safety review

## Flag resolver

`server/src/config/env.js`:

```javascript
shadowSafetyGateWebhookDiagnosticsEnabled:
  process.env.SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED === 'true',
```

| Env value | Runtime |
|-----------|---------|
| absent | **OFF** |
| `false` / empty / any non-`'true'` | **OFF** |
| `'true'` | ON (diagnostics only) |

## Production safety when OFF

- `maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary` returns `null` immediately
- No log envelope emission
- `scheduleFulfillmentProcessing` unchanged
- No Stripe/provider/DB/network calls from shadow path

## L-81 action

No production env files modified. No deploy performed.

---

*End.*
