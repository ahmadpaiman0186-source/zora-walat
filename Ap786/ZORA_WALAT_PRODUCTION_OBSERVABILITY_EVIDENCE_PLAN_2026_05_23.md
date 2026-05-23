# Zora-Walat — Production Observability Evidence Plan (Stripe Webhook)

**Date:** 2026-05-23
**Status:** **PLAN ONLY**
**Parent:** [CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md)
**Gate 3 cross-ref:** [GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE](./ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md)

---

## 1. Purpose

Define structured logging, metrics, alerts, dashboard evidence, and incident response requirements so webhook failures are **detectable and diagnosable** — closing the gap exposed by **H7** (retention-limited May 19 RCA).

**Does not prove** observability is live until artifacts filed per Gate 3.

---

## 2. Structured log fields (baseline)

All webhook logs: **JSON structured**, single line, no raw payload, no secrets.

| Field | Type | Example / rule |
|-------|------|----------------|
| `timestamp` | ISO-8601 UTC | Required |
| `service` | string | `zora-walat-api-staging` / prod name |
| `route` | string | `/webhooks/stripe` |
| `event` | enum | See §3 lifecycle events |
| `stripe_event_id_suffix` | string | Last 6 chars only |
| `stripe_event_type` | string | e.g. `checkout.session.expired` |
| `checkout_session_id_suffix` | string | Optional |
| `order_id` | string | Internal id or suffix |
| `duration_ms` | number | Phase duration |
| `processing_status` | enum | `RECEIVED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `error_class` | enum | `TIMEOUT`, `SIGNATURE`, `DB`, `DOMAIN`, `UNKNOWN` |
| `deployment_sha` | string | Short SHA |
| `request_id` | string | Vercel request id — redact in Ap786 PNGs |

---

## 3. Lifecycle log events (required sequence)

| Event name | When emitted | Proves |
|------------|--------------|--------|
| **`webhook_received`** | First line of handler | Request reached app |
| **`signature_verified`** | After Stripe verify | `success: true/false` |
| **`event_persisted`** | Outbox commit | Durable receipt |
| **`ack_returned`** | Before HTTP response ends | Stripe ack timing |
| **`processing_started`** | Worker claims job | Async path entered |
| **`processing_completed`** | Worker success | Business logic done |
| **`processing_failed`** | Worker error | Needs reconciliation |
| **`duplicate_event_blocked`** | Duplicate `event.id` | Idempotency worked |
| **`no_pay_no_service_blocked`** | Fulfill blocked unpaid | Safety gate worked |

**Gap detection alert:** `webhook_received` without `ack_returned` within 10s → page.

---

## 4. Metrics and alert thresholds

| Metric | Threshold (staging) | Threshold (prod) | Severity |
|--------|---------------------|------------------|----------|
| `stripe_webhook_delivery_failures` (external) | > 0 in 1h | > 0 in 15m | **Critical** |
| `webhook_ack_duration_ms` p95 | > 4000 ms | > 3000 ms | **High** |
| `processing_failed` rate | > 0 in 1h | > 0 in 15m | **High** |
| `signature_verified{success=false}` | > 0 in 5m | > 0 in 5m | **Critical** |
| `duplicate_event_blocked` rate | Informational; spike review | Same | **Low** |
| `no_pay_no_service_blocked` | > 0 → review | > 0 → review | **Medium** |
| Log ingestion gap | Missing logs 15m | Missing logs 5m | **High** |

**Note:** Thresholds are **plan targets** — tune with baseline after implementation.

---

## 5. Dashboard evidence requirements (Gate 3)

| Dashboard ID | Panels | Filing artifact |
|--------------|--------|-----------------|
| **OBS-WH-01** | Delivery success rate by `event.type` | PNG redacted |
| **OBS-WH-02** | Ack latency p50/p95 | PNG |
| **OBS-WH-03** | `processing_failed` count | PNG |
| **OBS-WH-04** | Stripe dashboard cross-link (test/prod separate) | PNG |
| **OBS-WH-05** | Log retention policy + window | PNG (RC-06 class) |

**Status:** All **PENDING EVIDENCE**.

---

## 6. Incident response checklist

| Step | Action | Owner |
|------|--------|-------|
| 1 | Confirm Stripe dashboard failure scope (test vs prod) | Payments |
| 2 | Check `webhook_received` → `ack_returned` sequence in Vercel | Engineering |
| 3 | If `signature_verified=false` — **do not** rotate secret without Gate 4 | Security |
| 4 | If `processing_failed` — halt fulfill; check order states | Payments |
| 5 | If retention gap — document **INCONCLUSIVE**; do not guess RCA | SRE |
| 6 | File Ap786 incident note (sanitized) | Operator |
| 7 | Escalate to Track H only with approval | Program |

Ref: [SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW](./SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md).

---

## 7. Retention and historical correlation

| Tier | Limitation | Mitigation plan |
|------|------------|-----------------|
| Vercel Hobby | 30-day logs (filed) | Upgrade Observability Plus before pilot |
| Ap786 evidence | PNG + attestation | Forward capture within 24h of incidents |
| Stripe dashboard | Event list retained longer | Correlate by timestamp; redact IDs in git |

**May 19, 2026 window:** **BLOCKED / INCONCLUSIVE** — do not claim invocation proof.

---

## 8. Rollback observability

| Signal | Expected during rollback |
|--------|--------------------------|
| Deploy SHA change | `deployment_sha` field shifts |
| Error rate | May spike briefly — document |
| Kill switch | `processing_started` drops to 0 |

Drill evidence: [GATE3_INCIDENT_ROLLBACK_DRILL](./ZORA_WALAT_GATE3_INCIDENT_ROLLBACK_DRILL_EVIDENCE_CHECKLIST_2026_05_22.md).

---

## 9. Future branch

**Branch (do not create):** `docs/stripe-webhook-observability-evidence`

---

## 10. Verdict

| Item | Status |
|------|--------|
| Observability plan | **FILED** |
| Live metrics/alerts | **NOT PROVEN** |
| Gate 3 completion | **PENDING EVIDENCE** |
| Root cause | **NOT CONFIRMED** |
| Production / pilot | **NO-GO** |

---

*Observability evidence plan · plan only · complements Gate 3 pack*

