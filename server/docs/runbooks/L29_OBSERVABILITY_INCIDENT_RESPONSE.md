# L29 — Observability incident response runbook

**Scope:** Detection and first-response playbooks for production observability alerts. **Does not** replace vendor-specific procedures.

**Cross-links:** [L29_ALERT_ROUTING_ADR.md](../observability/L29_ALERT_ROUTING_ADR.md) · [L29_DASHBOARD_LOG_QUERIES.md](../observability/L29_DASHBOARD_LOG_QUERIES.md) · [L29_SYNTHETIC_MONITORS.md](../observability/L29_SYNTHETIC_MONITORS.md) · [INCIDENT_SCENARIOS.md](./INCIDENT_SCENARIOS.md)

---

## Webhook monitoring caveat (all Stripe webhook incidents)

- **HTTP 200 is not sufficient** for webhook success. Some paths log `webhook_transaction_failed` or similar while returning **200** so Stripe does not retry incorrectly.
- **Detection** must use structured logs (`transactionFailureClass`, `stripeEventType`, `moneyPath` spans) and Stripe Dashboard delivery outcomes — not status code alone.
- After **PR #5** (`l27-dispute-webhook-hardening`) merges, **`charge.dispute.created`** flows that require `charges.retrieve` and fail should return **HTTP 503** (`DisputeChargeLookupError`) — treat **503 spikes** on that route as retryable infrastructure/provider lookup failures.

---

## Shared response pattern

For every incident below:

1. **Declare** severity in incident channel; assign **incident commander** for P0.
2. **Silence** noisy vendor alerts **only** with ticket reference and expiry (see `L29_ALERT_ROUTING_ADR.md`).
3. **Capture** evidence per section before changing state (logs window, `/ready` JSON redacted, Stripe delivery IDs).

---

### API down

| Phase | Action |
|-------|--------|
| **Detection** | Synthetic `GET /health` fails; Vercel/platform incident; global 5xx spike |
| **Severity** | P0 |
| **First 5 minutes** | Confirm scope (single region vs global); check Vercel status; open logs last 15 min for crash loops |
| **Diagnostics** | Recent deploy? Env drift? `GET /health` locally against preview if safe; trace `uncaughtException` in Sentry/log drain |
| **Rollback / silence** | Roll back deployment per release policy; silence synthetics only during verified maintenance |
| **Escalation** | P0 unacked 15 min → secondary; platform outage → vendor ticket |
| **Evidence** | HAR, deploy id, log excerpt (redacted), error fingerprint |
| **Closure** | `/health` green 30 min; error rate at baseline; postmortem if customer impact |

---

### /ready degraded

| Phase | Action |
|-------|--------|
| **Detection** | Authenticated synthetic `GET /ready` returns **503** or missing expected JSON sections |
| **Severity** | P0 if `database_unreachable` / `db_probe_timeout`; else P1–P2 by `readinessReason` |
| **First 5 minutes** | Read `readinessReason`; snapshot JSON (redact tokens); compare to last known good |
| **Diagnostics** | DB: Neon/console; Redis: URL reachability; Reloadly block: sandbox/live mismatch; queue depth fields |
| **Rollback / silence** | Fix config (no secret paste in chat); maintenance banner if planned |
| **Escalation** | DB P0 → DBA/vendor; provider block → provider owner |
| **Evidence** | `readinessReason` enum + timestamp; vendor status pages |
| **Closure** | **200** sustained 30 min; dependent reason cleared |

---

### Vercel timeout

| Phase | Action |
|-------|--------|
| **Detection** | 504 / `FUNCTION_INVOCATION_TIMEOUT` in platform logs; latency SLO burn |
| **Severity** | P1 (P0 if payment path) |
| **First 5 minutes** | Identify route from logs; check cold start vs handler loop; verify DB/Redis slowness |
| **Diagnostics** | Trace slow query; webhook body size; external API latency |
| **Rollback / silence** | Roll back bad deploy; increase timeout **only** with architecture review |
| **Escalation** | Sustained payment path → P0 bridge |
| **Evidence** | Request id, route, duration histogram |
| **Closure** | p95 latency under internal target; no timeout errors 1 h |

---

### Stripe webhook 5xx

| Phase | Action |
|-------|--------|
| **Detection** | Stripe Dashboard delivery failures; app logs **5xx/503** on `/webhooks/stripe`; **also** scan for **200 + transaction failure** (see caveat above) |
| **Severity** | P0 if sustained; P2 if bursty |
| **First 5 minutes** | Classify event types affected; check deploy window; verify DB write health |
| **Diagnostics** | `StripeWebhookEvent` rows; Prisma codes; dispute path pre/post PR #5 behavior |
| **Rollback / silence** | Roll back breaking change; **do not** disable signature verification |
| **Escalation** | Ledger symptoms → finance + `INCIDENT_SCENARIOS.md` |
| **Evidence** | Stripe delivery id + `evt_` suffix; traceId |
| **Closure** | Dashboard green; log error rate baseline; replay policy documented |

---

### Stripe invalid signature spike

| Phase | Action |
|-------|--------|
| **Detection** | Logs `stripe_webhook_signature_invalid`; mission counter `webhooks_invalid_sig`; synthetic probe stops getting **400** |
| **Severity** | P2 abuse; **P1** if probe returns **200** (gate broken) |
| **First 5 minutes** | Confirm endpoint URL in Stripe matches prod; secret rotation events; DDoS pattern |
| **Diagnostics** | Geo / UA distribution; compare to new integration tests |
| **Rollback / silence** | WAF / rate limit (vendor); fix mis-rotated secret **in vault only** |
| **Escalation** | Suspected compromise → security |
| **Evidence** | Sample rate (no raw secrets); Dashboard webhook config version |
| **Closure** | Invalid sig rate at baseline; probe returns **400** again |

---

### Duplicate webhook / replay spike

| Phase | Action |
|-------|--------|
| **Detection** | Logs `webhook_duplicate_ignored`, `stripe_webhook_db_idempotent_replay`; metric `webhook_event_duplicate` |
| **Severity** | P2 unless tied to ledger drift |
| **First 5 minutes** | Correlate with Stripe retries or deploy; check idempotency table growth |
| **Diagnostics** | Per-`event.id` counts; worker double-delivery hypothesis |
| **Rollback / silence** | Fix handler throw causing Stripe retry storm before silencing |
| **Escalation** | Duplicate capture risk → P0 per double-charge scenario |
| **Evidence** | Event id suffix histogram |
| **Closure** | Duplicate rate normal; no recon REQUIRED spike |

---

### Payment captured but no fulfillment

| Phase | Action |
|-------|--------|
| **Detection** | `sla_fulfillment_breach`, `stuck_processing_over_threshold`; recon endpoint hints |
| **Severity** | P0 |
| **First 5 minutes** | `GET /api/admin/reconciliation/phase1-fulfillment`; verify worker/queue running |
| **Diagnostics** | Order phase1 truth; Stripe PI state; queue job presence |
| **Rollback / silence** | Enable queue; replay DLQ **only** per `INCIDENT_SCENARIOS.md` |
| **Escalation** | Manual fulfillment policy → ops |
| **Evidence** | Order id suffixes; recon export (redacted) |
| **Closure** | Backlog drained; SLA metric green |

---

### Fulfillment / provider failure

| Phase | Action |
|-------|--------|
| **Detection** | `fulfillment_failed` logs; circuit open; `/ready` Reloadly diagnostics |
| **Severity** | P1 (P0 if mass failure) |
| **First 5 minutes** | Classify `intelligenceClass`; check kill switches |
| **Diagnostics** | Provider status; MSISDN validity ratio; sandbox mismatch |
| **Rollback / silence** | Dispatch kill switch only with comms plan |
| **Escalation** | Provider TAM |
| **Evidence** | Failure class distribution; attempt ids |
| **Closure** | Success rate restored; circuit closed |

---

### Ledger / reconciliation mismatch

| Phase | Action |
|-------|--------|
| **Detection** | `moneyPathAlert` `missing_ledger` / `duplicate_payment_captured_ledger`; `RECONCILIATION_DRIFT` |
| **Severity** | P0 |
| **First 5 minutes** | Stop bulk replays; snapshot recon views |
| **Diagnostics** | Wallet ledger doc; Stripe balance transactions |
| **Rollback / silence** | **No** alert suppression without finance sign-off |
| **Escalation** | Engineering lead + finance |
| **Evidence** | Recon CSV hash; alert ids |
| **Closure** | Imbalance zeroed or documented exception |

---

### DB failure

| Phase | Action |
|-------|--------|
| **Detection** | `/ready` DB reason; `PrismaClientInitializationError`; Neon status |
| **Severity** | P0 |
| **First 5 minutes** | Confirm blast radius; pause destructive jobs |
| **Diagnostics** | Connection limit; migration status; network path |
| **Rollback / silence** | Failover per vendor runbook |
| **Escalation** | DBA / Neon support |
| **Evidence** | Error codes P1xxx; time range |
| **Closure** | Writes succeed; recon spot-check |

---

### Redis / queue failure

| Phase | Action |
|-------|--------|
| **Detection** | `redis_unavailable`, enqueue failures; DLQ growth; worker silence |
| **Severity** | P1 (P0 if combined with payment surge) |
| **First 5 minutes** | Verify `REDIS_URL`; memory/eviction; TLS errors |
| **Diagnostics** | Queue depth; stuck workers |
| **Rollback / silence** | Scale Redis; restart workers per playbook |
| **Escalation** | Vendor support |
| **Evidence** | Queue metrics; job id samples |
| **Closure** | Enqueue OK; backlog processed safely |

---

### Security / fraud anomaly

| Phase | Action |
|-------|--------|
| **Detection** | `fraud_risk_block`, auth anomaly metrics, geo spikes, rate limit 429 storm |
| **Severity** | P1–P0 by impact |
| **First 5 minutes** | Identify attack vs marketing; preserve logs |
| **Diagnostics** | IP cohorts; new endpoint abuse |
| **Rollback / silence** | WAF rules; **not** long silence without ticket |
| **Escalation** | Security lead |
| **Evidence** | Redacted log aggregates |
| **Closure** | Attack contained; customers unblocked |

---

## Revision

Update this runbook when new structured log fields or routes ship (especially post–PR #5 dispute behavior).
