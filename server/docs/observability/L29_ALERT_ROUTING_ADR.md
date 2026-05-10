# L29 — Alert routing ADR (Architecture Decision Record)

**Status:** Proposed — **not wired** in any environment. Requires operator approval before implementation.

**Scope:** Where production alerts should land after leaving the application (stdout JSON / optional Prometheus today).

---

## Context

The API emits structured signals (`moneyPathAlert`, `phase1CriticalAlert`, Phase 1 mission logs, pino HTTP logs) but does **not** ship a built-in external notifier. L29 closes the **design** gap by selecting a default path and rules; implementation is a separate change (Vercel/vendor consoles, no code deploy in this package).

---

## Options evaluated

| Option | Pros | Cons |
|--------|------|------|
| **1. Vercel logs + log drain → vendor** (Datadog, Grafana Cloud, Axiom, etc.) | Single plane for serverless; grep-friendly JSON already | Vendor cost; query language learning curve |
| **2. Sentry** | Strong error grouping, release tracking | Not a full log SIEM; complement not replace log drain |
| **3. Slack / PagerDuty bridge** | Fast human response | Needs stable parsing from logs or metric webhooks; on-call hygiene |
| **4. Datadog / Logtail-style alternative** | Dashboards + monitors + RUM optional | Same as (1); pick one vendor |

---

## Decision (recommended default)

**Primary:** **Vercel (or host) logs → log drain → one observability vendor** with:

- Log-based monitors on JSON fields documented in `L29_DASHBOARD_LOG_QUERIES.md`
- Optional **Prometheus scrape** of `GET /metrics` when `METRICS_PROMETHEUS_ENABLED=true` and `METRICS_REDIS_AGGREGATION=true` in multi-instance production (see `criticalConfigValidation.js` comments)

**Secondary (recommended):** **Sentry** (or equivalent) for **uncaught exceptions** and performance traces — **in addition to** logs, not instead of.

**Tertiary:** **PagerDuty** (or Opsgenie) as **on-call escalation** target fed by vendor monitors or Slack workflow — not hard-coded in repo.

---

## Placeholder environment names (no values)

Document these in vendor UI / `.env.example` when implementing — **never commit secrets**:

- `OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` — authenticate `GET /ready` and `GET /metrics` during prelaunch (`opsInfraHealthGate.js`).
- `METRICS_PROMETHEUS_ENABLED` — enable Prometheus text on `GET /metrics`.
- `METRICS_REDIS_AGGREGATION` — aggregate counters in Redis across replicas.
- `REDIS_URL` — required for aggregation and queues.
- Vendor-specific: e.g. `SENTRY_DSN`, `DATADOG_API_KEY`, log drain URL — **add only after vendor choice**.

---

## Severity routing (P0–P3)

| Tier | Meaning | Examples | Target latency |
|------|---------|----------|------------------|
| **P0** | Revenue / ledger integrity / total outage | API down, mass webhook failure, ledger missing capture, DB unavailable for writes | Page immediately |
| **P1** | Major degradation | `/ready` degraded, fulfillment SLA breach, provider hard down, reconciliation REQUIRED spike | Page & Slack |
| **P2** | Elevated risk | Invalid webhook sig spike, rate-limit abuse, stuck processing trend, Redis degraded | Slack + ticket |
| **P3** | Informational | Single-order anomalies, sandbox mismatch warnings, threshold approach | Ticket / daily digest |

---

## Owner / escalation matrix (template)

| Role | Responsibility |
|------|----------------|
| **Primary on-call** | Acknowledge P0/P1, execute first 5 minutes in `L29_OBSERVABILITY_INCIDENT_RESPONSE.md` |
| **Engineering lead** | Code/config rollback decisions, hotfix approval |
| **Finance / ops** | Ledger reconciliation, Stripe Dashboard correlation |
| **Security** | Fraud spikes, invalid signature storms, auth anomalies |

Escalation: P0 unacked **15 min** → secondary; **30 min** → engineering lead + incident channel.

---

## NO-GO conditions

- Wiring alerts to **personal** Slack DMs only (no shared on-call rotation).
- **Paging** on first deploy night without baseline (noise storm).
- **Disabling** `moneyPathAlert` / `phase1CriticalAlert` in code to silence monitors — use vendor silence + fix root cause.
- **Logging** raw card data, full Stripe payloads, or secrets in alert bodies.

---

## Rollback / silence policy

1. **Silence at vendor** (time-boxed, named incident ID, owner).
2. **Rollback** deploy only when observability regression is deploy-caused; document in incident record.
3. **Never** silence P0 ledger/missing-capture class without finance sign-off.
4. Review silences **weekly**; auto-expire max 7 days unless extended with reason.

---

## Explicit note

**This ADR is documentation only.** No alert sink is selected or configured by this file. Implementation requires operator approval, vendor contract review, and compliance sign-off where applicable.
