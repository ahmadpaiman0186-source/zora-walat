# L22 — Distributed tracing & correlation (Zora-Walat API)

## What exists today (no OpenTelemetry SDK)

The server uses **structured JSON logs** + **stable correlation IDs**, designed to join stdout, metrics hooks, and admin tools **without** emitting raw payloads or secrets.

| Mechanism | Role |
|-----------|------|
| **`requestContextMiddleware`** | Every HTTP request gets `traceId` + `requestId` (or accepts `X-Trace-Id` / `X-Request-Id`), stored in **`correlationStorage`** (AsyncLocalStorage); response echoes `X-Trace-Id`, `X-Request-Id`. |
| **`runWithTrace` / `getTraceId`** | Workers and scheduled paths bind a trace for fulfillment/recovery; **`getTraceId()`** also **falls back** to HTTP correlation so ledger / `moneyPathLog` see the same id inside webhook handlers. |
| **`correlationContext`** | Optional `orderId` / `attemptId` + `surface` for richer joins. |
| **`emitMoneyPathLog` / `emitL7MoneyPathSpan`** | Money-path events with `traceId` + sanitized refs (`l7` schema `zora.l7.money_path.v1`). |
| **`phase1FulfillmentWorker`** | BullMQ job payload carries **`traceId`** into `processFulfillmentForOrder`. |
| **`providerExecutionCorrelation`** | **Safe** `zw_pe:…` id + Reloadly `customIdentifier` discipline (no secrets). |
| **`phase1ObservabilitySanitize`** | Redacts secrets, phones, emails, Stripe-shaped keys before log emission. |

## Stripe webhook

Mounted **after** `requestContextMiddleware` (`app.js`): webhook handlers have **`req.traceId`** and correlation ALS. Phase 1 handlers propagate trace into fulfillment scheduling and L7 spans.

## OpenTelemetry readiness (decision)

- **`@opentelemetry/api`** may appear transitively in the lockfile; there is **no** full OTel SDK/exporter wired in application code.
- **Recommendation:** keep **stdout JSON** as the primary signal; when adopting OTel, **propagate the existing `traceId` string** as the trace / span attribute `zw.trace_id` (or W3C traceparent derived from it) so current grep/dashboards remain valid.

## Safety rules (unchanged)

- Do not log webhook bodies, card data, JWTs, or provider credentials.
- Use **suffix-only** ids in refs where possible (`safeSuffix`, `orderIdSuffix`).

## Tests

- `test/requestContextTraceBridge.test.js` — HTTP correlation visible via `getTraceId`.
- `test/l7Observability.test.js`, `test/phase1Observability.test.js` — sanitization / redaction.
- `test/providerExecutionCorrelation.test.js` — correlation id shape.
