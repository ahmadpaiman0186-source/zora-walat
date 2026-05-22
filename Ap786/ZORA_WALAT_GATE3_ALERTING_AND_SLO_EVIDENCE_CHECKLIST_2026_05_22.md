# Zora-Walat — Gate 3 Alerting and SLO Evidence Checklist

**Date:** 2026-05-22
**Gate:** 3 — Alerting and SLO evidence
**Capture pack:** [ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md](./ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md)
**Proof plan:** [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md)

**Policy:** Mark **COMPLETE** only when existing filed artifacts prove the row. Production observability remains **NOT PROVEN** until manifest rows move to **EVIDENCE FILED**.

---

## 1. Purpose

Checklist for **SLI/SLO definitions**, **alert configuration proof**, **dashboard screenshots**, **synthetic monitoring**, and **money-path monitors** required to exit Gate 3.

---

## 2. SLI/SLO evidence model

| Stage | Description | Status |
|-------|-------------|--------|
| **Proposed** | Targets documented — no measurement | **PROPOSED** (most rows) |
| **Measured (staging)** | Staging harness only | **PARTIAL** where noted |
| **Measured (production)** | 30d window report filed | **NOT PROVEN** |
| **Attested** | SRE sign-off on report | **APPROVAL REQUIRED** |

---

## 3. Required service-level indicators

| SLI ID | SLI definition | Measurement source | Status |
|--------|----------------|-------------------|--------|
| SLI-AVAIL-001 | Synthetic HTTP success rate | External synthetic | **PROPOSED / NOT PROVEN** |
| SLI-AVAIL-002 | API `/api/health` success | Internal probe | **PROPOSED / NOT PROVEN** |
| SLI-LAT-001 | p95 `POST /api/topup-orders` | APM histogram | **PROPOSED / NOT PROVEN** |
| SLI-LAT-002 | p95 webhook handler | APM / logs | **PROPOSED / NOT PROVEN** |
| SLI-MONEY-001 | Webhook 2xx / received ratio | Stripe + app metrics | **PROPOSED / NOT PROVEN** |
| SLI-MONEY-002 | SEV1 money incidents count | IC tickets | **PROPOSED / NOT PROVEN** |
| SLI-ERR-001 | HTTP 5xx ratio by route | RED metrics | **PROPOSED / NOT PROVEN** |

---

## 4. Required service-level objectives

| SLO ID | SLI | Target (proposed) | Window | Error budget | Status |
|--------|-----|-------------------|--------|--------------|--------|
| SLO-AVAIL-001 | SLI-AVAIL-001 | 99.9% | 30d | 43.2m | **PROPOSED / NOT PROVEN** |
| SLO-LAT-001 | SLI-LAT-001 | p95 < 800ms | 30d | Burn alert | **PROPOSED / NOT PROVEN** |
| SLO-WH-001 | SLI-MONEY-001 | 99.95% | 30d | TBD | **PROPOSED / NOT PROVEN** |
| SLO-MONEY-001 | SLI-MONEY-002 | 0 SEV1 / month | 30d | Zero tolerance | **PROPOSED / NOT PROVEN** |

**Proof artifact:** `OBS-SLO-REPORT-001` — monthly PDF with error budget chart — **PENDING EVIDENCE**.

---

## 5. Alert severity taxonomy

| Severity | Definition | Response target | Page? | Status |
|----------|------------|-----------------|-------|--------|
| **SEV1** | Money integrity or data corruption risk | < 15m ack | Yes | **PROPOSED** (routing **NOT PROVEN**) |
| **SEV2** | Customer-visible outage / severe degradation | < 30m ack | Yes | **PROPOSED** |
| **SEV3** | Abuse / elevated non-critical errors | Business hours | Optional | **PROPOSED** |
| **SEV4** | CI Guard failure | Before merge | CI only | **COMPLETE (CI)** |

---

## 6. Alert routing evidence checklist

| Row | Alert ID | Route proof required | Status |
|-----|----------|----------------------|--------|
| AR-01 | A-01 | Pager/Slack screenshot + on-call roster placeholder | **PENDING EVIDENCE** |
| AR-02 | A-02 | Drill notification + ticket ID | **PENDING EVIDENCE** |
| AR-03 | A-03 | Latency breach notification | **PENDING EVIDENCE** |
| AR-04 | A-04 | Payments + IC route on webhook 5xx | **PENDING EVIDENCE** |
| AR-05 | A-05 | Gate denial page — no auto-fulfill proof | **PENDING EVIDENCE** |
| AR-06 | A-06 | Duplicate webhook prod page | **PENDING EVIDENCE** |
| AR-07 | A-07 | Synthetic fail 3x page | **PENDING EVIDENCE** |
| AR-08 | A-08 | CI pipeline notification | **COMPLETE (CI scope)** |

**Manifest cross-ref:** `OBS-ALERT-TEST-001` … `003` — all **PENDING EVIDENCE** except CI.

---

## 7. Dashboard screenshot checklist

| Row | Artifact ID | Panel requirements | Status |
|-----|-------------|-------------------|--------|
| DS-01 | `OBS-DASH-PLATFORM-001` | Uptime, 5xx, p95, deploy SHA — sanitized | **PENDING EVIDENCE** |
| DS-02 | `OBS-DASH-MONEY-001` | Webhook outcomes, gate denials — no raw Stripe | **PENDING EVIDENCE** |
| DS-03 | `OBS-DASH-FULFILL-001` | Queue, SLA, terminal states | **PENDING EVIDENCE** |
| DS-04 | `OBS-DASH-SEC-001` | Auth failures, abuse — no PII | **PENDING EVIDENCE** |
| DS-05 | `OBS-TRACE-MONEY-001` | Trace waterfall — IDs redacted | **PENDING EVIDENCE** |

**Rejection:** PR #35 frontend PNGs used as APM substitute — **reject**.

---

## 8. Synthetic monitoring checklist

| Row | Check | URL / probe | Status |
|-----|-------|-------------|--------|
| SYN-01 | Frontend home 200 | Public URL | **PROPOSED / NOT PROVEN** |
| SYN-02 | API health | `/api/health` | **PROPOSED / NOT PROVEN** |
| SYN-03 | API ready | `/api/ready` | **PROPOSED / NOT PROVEN** |
| SYN-04 | Success route smoke | Staging/test only | **BLOCKED** (prod live-money) |
| SYN-05 | 7d history export | `OBS-SYNTH-UPTIME-001` | **PENDING EVIDENCE** |

---

## 9. API monitoring checklist

| Row | Signal | Alert | Status |
|-----|--------|-------|--------|
| API-01 | `http_requests_total` | N/A | **PENDING EVIDENCE** |
| API-02 | `http_request_duration_seconds` | A-03 | **PENDING EVIDENCE** |
| API-03 | `http_5xx_ratio` | A-02 | **PENDING EVIDENCE** |
| API-04 | Health synthetic | A-01 | **PENDING EVIDENCE** |
| API-05 | Ready probe | A-01 variant | **PARTIAL** (route exists) |

---

## 10. Payment / webhook monitoring checklist

| Row | Signal | Alert | Staging | Production |
|-----|--------|-------|---------|------------|
| PAY-01 | Webhook processing counter | A-04 | **PARTIAL** | **NOT PROVEN** |
| PAY-02 | Webhook 5xx rate | A-04 | **PENDING EVIDENCE** | **NOT PROVEN** |
| PAY-03 | PAID transition visibility | N/A | **PARTIAL** | **NOT PROVEN** |
| PAY-04 | Stripe Dashboard correlation | Manual IC | **PENDING REVIEW** | **NOT PROVEN** |

---

## 11. No-pay-no-service monitoring checklist

| Row | Control | Proof | Status |
|-----|---------|-------|--------|
| NPS-01 | `UNPAID_FULFILLMENT_ATTEMPT` alert | A-05 drill | **PENDING EVIDENCE** |
| NPS-02 | Gate denial counter | `OBS-LOG-GATE-001` | **PENDING EVIDENCE** |
| NPS-03 | Fulfillment blocked without PAID | Staging harness | **PARTIAL** (staging) |
| NPS-04 | Prod gate denial dashboard panel | Money dashboard | **NOT PROVEN** |

---

## 12. Duplicate transaction monitoring checklist

| Row | Control | Proof | Status |
|-----|---------|-------|--------|
| DUP-01 | `duplicate_payment_webhook_total` | Counter export | **PENDING EVIDENCE** |
| DUP-02 | L-4/L-5 staging replay | Ap786 docs | **COMPLETE (staging scope)** |
| DUP-03 | A-06 prod drill | IC record | **NOT PROVEN** |
| DUP-04 | Zero duplicate in prod (30d) | SLO report slice | **NOT PROVEN** |

---

## 13. Incident notification checklist

| Row | Requirement | Status |
|-----|-------------|--------|
| INC-N-01 | On-call rotation documented (placeholder) | **PENDING REVIEW** |
| INC-N-02 | SEV1 template comms | **PROPOSED** (runbook) |
| INC-N-03 | Drill alert received < 15m (SEV1) | **NOT EXECUTED** |
| INC-N-04 | Ticket ID linked to alert | **PENDING EVIDENCE** |

---

## 14. Evidence naming and storage rules

| Rule | Requirement |
|------|-------------|
| Path | `Ap786/evidence/observability-2026-05-21/` |
| Filename | `{manifest-id}_{YYYYMMDD}_{scope}.png` or `.pdf` |
| Redaction | Order IDs suffix only; no secrets/PII |
| INDEX | Update manifest § INDEX when filing |
| Git | Binary evidence may use LFS or external store per team policy — document pointer in manifest |

---

## 15. Evidence rejection criteria

| Rejection reason | Action |
|------------------|--------|
| Unsanitized secret in screenshot | Reject; rotate if exposed per G-01 |
| PR #35 UI PNG as APM proof | Reject row |
| Invented uptime percentage | Reject; require synthetic export |
| Staging-only proof labeled prod | Reject; re-label scope |
| Alert screenshot without ticket ID | **PENDING REVIEW** until linked |

---

## 16. Current evidence status (summary)

| Category | COMPLETE | PENDING / NOT PROVEN |
|----------|----------|----------------------|
| CI Guard (A-08) | 1 | — |
| Staging L-4/L-5 duplicate | 1 (staging) | Prod duplicate |
| Dashboards | 0 | 5 |
| Prod alerts A-01…A-07 | 0 | 7 |
| SLO reports | 0 | 4 |
| Synthetics prod | 0 | 5 |
| Production observability (overall) | — | **PLAN ONLY / NOT PROVEN** |

**Gate 3 alerting/SLO:** **PENDING EVIDENCE** — do **not** mark production observability **COMPLETE**.

---

*Gate 3 Alerting & SLO Checklist · no fake observability proof*
