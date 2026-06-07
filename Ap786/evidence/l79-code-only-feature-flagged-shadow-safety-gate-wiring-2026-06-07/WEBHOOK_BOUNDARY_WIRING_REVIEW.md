# L-79 — Webhook boundary wiring review

**Module:** `server/src/routes/stripeWebhook.routes.js`

## Hook points

1. Post-commit primary path (~line 675) — before `scheduleFulfillmentProcessing(orderIdToScheduleFulfillment, …)`
2. P2002 replay recovery path (~line 558) — before `scheduleFulfillmentProcessing(String(raw), …)`

## Invariants preserved

- `scheduleFulfillmentProcessing` still invoked on same conditions
- Shadow hook never branches on `fulfillmentIntentAllowed`
- `wouldScheduleFulfillment` always false in diagnostics

---

*End.*
