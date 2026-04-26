/**
 * Layer 3 — scaling / failover / monitoring / risk insertion points (documentation + stable symbols).
 *
 * Current runtime split is enforced in `runtime/serverLifecycle.js` via `ZW_RUNTIME_KIND`
 * (`api` | `worker` | `serverless`). Do not duplicate process management here.
 *
 * | Concern            | Where to extend today                          |
 * |--------------------|-----------------------------------------------|
 * | API vs worker I/O  | `scheduleFulfillmentProcessing`, BullMQ producer |
 * | Webhook durability | `stripeWebhook.routes.js`, idempotency rows   |
 * | Retries / circuit  | `services/reliability/*`, `transactionRetryPolicy` |
 * | Risk / fraud       | `services/risk/logRiskDecision.js`, order metadata `fraudSignals` |
 * | Metrics / alerts   | `lib/opsMetrics.js`, `lib/opsAlerts.js`, `logOpsEvent` |
 * | Future multi-region| Keep DB + Redis URLs in `config/env.js` only; no hard-coded regions |
 */

export const RUNTIME_SURFACE = Object.freeze({
  API_HTTP: 'api_http',
  STRIPE_WEBHOOK: 'stripe_webhook',
  FULFILLMENT_WORKER: 'fulfillment_worker',
  INLINE_SCHEDULE: 'inline_schedule',
});

/** Stable labels for log/metrics agents (grep / alert routing). */
export const MONITORING_INSERTION_POINTS = Object.freeze({
  MONEY_PATH_JSON: 'moneyPathLog.emitMoneyPathLog',
  PHASE1_OPS_JSON: 'emitPhase1OperationalEvent',
  OPS_METRICS: 'lib/opsMetrics',
  OPS_LOG: 'logOpsEvent',
  RELIABILITY_WATCHDOG: 'recordReliabilityDecision',
  RISK_DECISION: 'logRiskDecision',
});

/**
 * Future staged deploys (no orchestrator here): separate processes by env + `ZW_RUNTIME_KIND`.
 * Keep one Docker image / one repo; scale replicas per role label in your host (Fly, ECS, K8s).
 */
export const DEPLOYMENT_ROLE_BOUNDARIES = Object.freeze({
  API_AND_WEBHOOKS: 'api_process_handles_http_including_raw_stripe_webhook',
  WORKER: 'dedicated_process_BullMQ_consumer_and_optional_recovery_loops',
  SERVERLESS: 'lambda_style_no_background_loops_see_serverLifecycle',
});
