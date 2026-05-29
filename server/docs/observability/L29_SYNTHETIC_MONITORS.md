# L29 — Synthetic monitors specification

**Status:** Specification only. Implement in Vercel Cron, external uptime SaaS, or vendor synthetics — **not** deployed by this package.

**Base URL:** Use production API hostname (placeholder: `https://<API_HOST>`). No secrets in this document.

---

## Global conventions

- **Timeout:** Fail monitor if no response bytes within stated timeout.
- **User-Agent:** Set a stable string e.g. `ZoraL29Synthetic/1.0` for log filtering.
- **Evidence:** Store last 7 days of check results in vendor; export JSON on incident.

---

### 1. Liveness — `GET /health`

| Field | Value |
|-------|--------|
| **URL/method** | `GET https://<API_HOST>/health` |
| **Expected** | HTTP **200**, JSON body indicating OK (see `sendLivenessJsonOk`) |
| **Timeout** | 5s |
| **Frequency** | 1 min |
| **Severity** | P0 |
| **Alert threshold** | 2 consecutive failures OR >5% fail over 5 min |
| **Owner** | Primary on-call |
| **Runbook** | [L29_OBSERVABILITY_INCIDENT_RESPONSE.md](../runbooks/L29_OBSERVABILITY_INCIDENT_RESPONSE.md) § API down |
| **Evidence** | Screenshot + HAR; correlate Vercel incident |

---

### 2. Readiness — `GET /ready` (authenticated)

| Field | Value |
|-------|--------|
| **URL/method** | `GET https://<API_HOST>/ready` |
| **Headers** | `Authorization: Bearer <OPS_HEALTH_TOKEN>` **or** `X-ZW-Ops-Token: <OPS_HEALTH_TOKEN>` |
| **Expected** | HTTP **200** when healthy; **503** + `readinessReason` when degraded |
| **Timeout** | 15s (readiness runs bounded probes) |
| **Frequency** | 1–5 min |
| **Severity** | P0 if unexpected 503; P2 if intermittent |
| **Alert threshold** | Any 503 outside maintenance window OR `readinessReason` in {`database_unreachable`, `db_probe_timeout`} |
| **Owner** | Primary on-call |
| **Runbook** | § /ready degraded |
| **Evidence** | Response JSON redacted; token never logged |

**Prelaunch:** If `PRELAUNCH_LOCKDOWN=true`, unauthenticated `/ready` may return 503 — synthetics **must** use token.

---

### 3. Stripe webhook — invalid signature probe

| Field | Value |
|-------|--------|
| **URL/method** | `POST https://<API_HOST>/webhooks/stripe` |
| **Headers** | `Content-Type: application/json`, `Stripe-Signature: <invalid or wrong secret>` |
| **Body** | Minimal valid JSON shape for an event (synthetic `evt_…`) |
| **Expected** | HTTP **400** (signature rejection) |
| **Timeout** | 10s |
| **Frequency** | 5–15 min |
| **Severity** | P3 (probe health); flip to P1 if **200** (signature gate broken) |
| **Alert threshold** | Expected 400 rate < 100%; alert if not 400 |
| **Owner** | Security + on-call |
| **Runbook** | § Stripe invalid signature spike (inversion: probe must fail closed) |
| **Evidence** | Never use production signing secret in synthetic body; use wrong secret by design |

---

### 4. Stripe webhook — 5xx / retry spike (external + log)

| Field | Value |
|-------|--------|
| **Source** | **Stripe Dashboard** → Webhooks → delivery failures + **application logs** for `statusCode` 5xx / `dispute_charge_lookup_failed_pre_tx` |
| **Expected** | Steady low failure rate; Stripe retries succeed |
| **Frequency** | Real-time (vendor) + 5 min rollups |
| **Severity** | P0 if sustained 5xx; P2 if bursty |
| **Alert threshold** | > N failures / 10 min (set N from baseline) OR log spike `webhook_transaction_failed` |
| **Owner** | On-call |
| **Runbook** | § Stripe webhook 5xx |
| **Evidence** | Stripe delivery ID + correlation `traceId` from logs |

---

### 5. Fulfillment backlog / stuck

| Field | Value |
|-------|--------|
| **Source A** | `GET /ready` JSON → `webTopupFulfillmentJobsQueued`, stuck summary fields |
| **Source B** | Prometheus `financial_sla_breach_total` / mission fulfillment rate (if enabled) |
| **Expected** | Queues bounded; SLA breaches near zero |
| **Frequency** | 5 min |
| **Severity** | P1 |
| **Alert threshold** | Queue depth > N OR SLA breach metric delta > 0 in 15 min window |
| **Owner** | On-call |
| **Runbook** | § payment captured but no fulfillment; § fulfillment/provider failure |
| **Evidence** | `/ready` snapshot + order suffix samples |

---

### 6. Provider / Reloadly degraded

| Field | Value |
|-------|--------|
| **Source** | `/ready` → `getAirtimeReloadlyDiagnosticsSnapshot` block; circuit snapshots; `moneyPathAlert` provider codes |
| **Expected** | Sandbox/prod flags match policy; circuits closed |
| **Frequency** | 15 min |
| **Severity** | P2 (P1 if fulfillment blocked) |
| **Alert threshold** | Circuit open OR diagnostic shows outbound blocked unexpectedly |
| **Owner** | On-call + provider owner |
| **Runbook** | § fulfillment/provider failure |
| **Evidence** | Redacted snapshot only |

---

### 7. DB connectivity / readiness

| Field | Value |
|-------|--------|
| **Source** | Synthetic `/ready` (auth) + Prisma errors in logs |
| **Expected** | 200 + DB check ok |
| **Frequency** | 1–5 min |
| **Severity** | P0 |
| **Alert threshold** | `readinessReason` DB-related OR log `PrismaClientInitializationError` spike |
| **Owner** | On-call |
| **Runbook** | § DB failure |
| **Evidence** | readinessReason enum only |

---

### 8. Redis / queue degraded (if enabled)

| Field | Value |
|-------|--------|
| **Precondition** | `FULFILLMENT_QUEUE_ENABLED=true` and `REDIS_URL` set |
| **Source** | Worker logs; enqueue failure logs; optional Redis ping from vendor agent (not in repo) |
| **Expected** | Enqueue succeeds; DLQ not growing unbounded |
| **Frequency** | 5 min |
| **Severity** | P1 |
| **Alert threshold** | `fulfillment_enqueue_failed` pattern OR DLQ rate SLO (see SLO doc) |
| **Owner** | On-call |
| **Runbook** | § Redis/queue failure |
| **Evidence** | Queue depth metrics + job id suffixes |

---

## Implementation checklist (operator)

- [ ] Create monitors in vendor with production URL
- [ ] Store `OPS_HEALTH_TOKEN` in vendor secret store; rotate quarterly
- [ ] Baseline 7 days before paging thresholds
- [ ] Link each monitor to runbook section
