# Zora-Walat — Gate 3 Observability Control Matrix

**Date:** 2026-05-22
**Gate:** 3 — Production observability controls
**Capture pack:** [ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md](./ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md)
**Manifest:** [ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md](./ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md)

**Policy:** Placeholder owner roles only. **No** invented dashboards, metrics, or approvals.

---

## 1. Purpose

Map each observability **control** to required telemetry, dashboards, alerts, log/audit artifacts, risks, evidence status, and Gate 3 exit criteria. Used by SRE, payments safety, and diligence reviewers to burn down blind spots before launch.

---

## 2. Observability control model

| Layer | Function | Auto-remediation |
|-------|----------|------------------|
| **Detect** | Metrics, logs, traces, synthetics | None |
| **Alert** | Route by severity to on-call | Page only (when configured) |
| **Triage** | IC + runbook + Super-System read-only | None |
| **Contain** | Stop deploy, feature flags (manual) | **No** money mutation |
| **Recover** | Manual rollback / fix forward | **No** self-healing apply |
| **Prove** | File artifacts → manifest | Human sign-off |

---

## 3. Control domains

| Domain | Controls (IDs) | Primary owner placeholder |
|--------|----------------|---------------------------|
| Platform | CTRL-G3-001…003 | SRE / Operations Owner |
| API / latency | CTRL-G3-004…006 | Engineering Owner |
| Money-path | CTRL-G3-007…012 | Payments Owner |
| Fulfillment / gates | CTRL-G3-013…015 | Engineering Owner |
| Security / audit | CTRL-G3-016…018 | Security Owner |
| Incident / rollback | CTRL-G3-019…021 | SRE / Operations Owner |
| Governance | CTRL-G3-022 | Product Owner |

---

## 4. Control matrix

| Control ID | Domain | Control objective | Required telemetry | Required dashboard | Required alert | Required log/audit artifact | Risk if missing | Current evidence status | Placeholder owner role | Exit criteria | Gate dependency |
|------------|--------|-------------------|--------------------|--------------------|----------------|-----------------------------|-----------------|-------------------------|------------------------|---------------|-----------------|
| CTRL-G3-001 | Platform | Detect frontend outage | Synthetic HTTP 200, optional RUM | Platform overview uptime panel | A-07 synthetic fail | N/A | Customer-visible blind spot | **NOT PROVEN** | SRE / Operations Owner | `OBS-SYNTH-UPTIME-001` filed | Gate 3 |
| CTRL-G3-002 | Platform | Detect API hard down | `/api/health` probe | Platform 5xx + health | A-01 health down | `OBS-LOG-STRUCT-001` sample | Undetected outage | **PARTIAL** (endpoint exists) | SRE / Operations Owner | A-01 drill + dashboard | Gate 3 |
| CTRL-G3-003 | Platform | Track deploy version in telemetry | Deploy tag/SHA label | Platform overview version panel | N/A | Deploy log enum | Wrong rollback target | **NOT PROVEN** | Engineering Owner | Dashboard shows SHA | Gate 3 |
| CTRL-G3-004 | API | Measure error rate | `http_5xx_ratio` RED | Platform 5xx by route | A-02 5xx spike | Redacted access log | Silent degradation | **NOT PROVEN** | Engineering Owner | `OBS-METRICS-RED-001` | Gate 3 |
| CTRL-G3-005 | API | Measure latency SLO | p95 histogram | Platform p95 panel | A-03 p95 breach | Trace sample | SLO breach unnoticed | **NOT PROVEN** | Engineering Owner | SLO report + A-03 drill | Gate 3 |
| CTRL-G3-006 | API | Ready vs liveness distinction | `/api/ready` deps | Ready panel | A-01 variant | Ready check log | False “healthy” | **PARTIAL** (route exists) | Engineering Owner | Ready synthetic + panel | Gate 3 |
| CTRL-G3-007 | Money | Stripe webhook health | `stripe_webhook_processing_total` | Money webhook panel | A-04 webhook 5xx | `OBS-LOG-WH-001` | Paid state drift | **NOT PROVEN** (prod) | Payments Owner | A-04 drill + panel | Gate 3, G-04 |
| CTRL-G3-008 | Money | Checkout/top-up flow latency | Session create duration | Money path checkout | A-03 | Trace checkout span | Checkout failures hidden | **NOT PROVEN** (prod) | Payments Owner | `OBS-TRACE-MONEY-001` | Gate 3 |
| CTRL-G3-009 | Money | Order state transition visibility | PAID/terminal counters | Money PAID transitions | N/A | State enum logs | Stuck orders | **PARTIAL** (staging) | Payments Owner | Prod dashboard filed | Gate 3 |
| CTRL-G3-010 | Money | Duplicate webhook detection | `duplicate_payment_webhook_total` | Money duplicates | A-06 duplicate prod | Gate enum log | Double credit risk | **PARTIAL** (staging L-4/L-5) | Payments Owner | A-06 prod drill | Gate 3, G-04 |
| CTRL-G3-011 | Money | No-pay-no-service enforcement | `payment_gate_denial_total` | Gate denials | A-05 unpaid fulfill | `OBS-LOG-GATE-001` | Unpaid fulfillment | **NOT PROVEN** (prod) | Payments Owner | A-05 drill | Gate 3, G-04 |
| CTRL-G3-012 | Money | Wallet credit boundary | Credit attempt denials | Money wallet panel | A-05 variant | Audit operator log | Unauthorized credit | **NOT PROVEN** (prod) | Payments Owner | Drill + monitor | Gate 3, G-04 |
| CTRL-G3-013 | Fulfillment | Queue / SLA visibility | fulfillment metrics | Fulfillment dashboard | Stuck non-terminal | Fulfillment enum logs | SLA breach unseen | **NOT PROVEN** | SRE / Operations Owner | `OBS-DASH-FULFILL-001` | Gate 3 |
| CTRL-G3-014 | Fulfillment | Terminal state proof | `fulfillment_terminal_total` | Terminal panel | N/A | Terminal transition log | Incomplete orders | **PARTIAL** (staging) | Engineering Owner | Prod panel filed | Gate 3 |
| CTRL-G3-015 | Fulfillment | Refund / L-12 / L-13 tracking | Refund anomaly counter | Money refunds panel | Refund anomaly (proposed) | Refund enum log | Refund integrity gap | **NOT PROVEN** | Payments Owner | L-12/L-13 evidence plan | Gate 5 |
| CTRL-G3-016 | Security | Auth failure visibility | auth failure counter | Security dashboard | Abuse spike SEV3 | Auth enum log | Account abuse blind | **NOT PROVEN** | Security Owner | `OBS-DASH-SEC-001` | Gate 4 |
| CTRL-G3-017 | Security | Credential incident detect | Guard + secret scan CI | Security panel | A-08 CI | `secrets:scan` report | Secret leak | **COMPLETE (CI scope)** | Security Owner | CI only — prod rotation separate | Gate 4 |
| CTRL-G3-018 | Audit | Operator action trail | operator action log | N/A | N/A | `OBS-LOG-OPERATOR-001` | Non-repudiation gap | **NOT PROVEN** | Security Owner | Redacted sample filed | Gate 3 |
| CTRL-G3-019 | Incident | IC detection path | Alert → ticket | N/A | Any SEV1/2 drill | Drill record `OBS-DRILL-` | Chaos without process | **NOT PROVEN** | SRE / Operations Owner | `OBS-ALERT-TEST-001` | Gate 3 |
| CTRL-G3-020 | Rollback | Manual rollback verified | Post-deploy health | Platform panel | N/A | Rollback runbook record | Bad deploy prolonged | **NOT PROVEN** | SRE / Operations Owner | `OBS-RB-001` | Gate 3 |
| CTRL-G3-021 | Rollback | Post-rollback synthetics green | Synthetic pass | Uptime panel | A-07 clear | Synthetic history | False recovery | **NOT PROVEN** | SRE / Operations Owner | `OBS-RB-002` | Gate 3 |
| CTRL-G3-022 | Governance | Self-healing apply blocked | zw-doctor policy | Super-System manual | N/A | G-10 policy doc | Autonomous money mutation | **COMPLETE (policy)** | Product Owner | G-10 remains **NOT ENABLED** | G-10 |

---

## 5. Evidence required per control

| Control ID | Minimum filed artifacts |
|------------|-------------------------|
| CTRL-G3-001…003 | Dashboard PNG + synthetic 7d history |
| CTRL-G3-004…006 | RED export + alert drill receipt |
| CTRL-G3-007…012 | Money dashboard + webhook/gate logs + A-04/A-05/A-06 drills |
| CTRL-G3-013…015 | Fulfillment dashboard + refund plan cross-ref |
| CTRL-G3-016…018 | Security dashboard + redacted log pack |
| CTRL-G3-019…021 | Drill checklist pass + rollback record |
| CTRL-G3-022 | Policy reference only — no apply enablement |

---

## 6. Monitoring owner placeholder roles

| Role | Owns controls | Cannot unilaterally |
|------|---------------|---------------------|
| **Engineering Owner** | API, fulfillment code signals | Enable prod live-money |
| **SRE / Operations Owner** | Platform, synthetics, rollback | Mark Gate 3 complete |
| **Security Owner** | Auth, credentials, audit logs | Execute G-01 rotation |
| **Payments Owner** | Money-path monitors | Stripe prod refunds |
| **QA Owner** | Test correlation to monitors | Claim QA PASS globally |
| **Product Owner** | G-10 apply policy | Override NO-GO |

---

## 7. Alert routing placeholders

| Severity | Route (placeholder) | Auto-action |
|----------|---------------------|-------------|
| SEV1 money | Pager + IC + Payments Owner | **None** |
| SEV2 | Pager + Slack | **None** |
| SEV3 | Business hours queue | **None** |
| SEV4 | CI notification | Block merge (A-08) |

**Status:** Production routes **NOT PROVEN** — configure only with **OBS-G2** approval.

---

## 8. Failure detection requirements

| Failure class | Max detection window (proposed) | Proof |
|---------------|--------------------------------|-------|
| API hard down | 2m | A-01 drill |
| 5xx spike | 5m | A-02 drill |
| Webhook processing fail | 5m | A-04 drill |
| Duplicate payment webhook | Real-time counter | A-06 drill |
| Synthetic fail | 3 consecutive | A-07 drill |

---

## 9. Safe failover requirements

| Scenario | Failover | Forbidden auto-failover |
|----------|----------|-------------------------|
| Region/edge outage | Manual status comms | Auto deploy |
| DB degraded | Read-only mode (manual) | Auto migration |
| Stripe webhook down | Pause fulfill (manual IC) | Webhook replay |
| Bad deploy | Rollback per runbook | Self-healing apply |

---

## 10. Auto-repair boundaries

| Capability | Status |
|------------|--------|
| Super-System detect/report | **Allowed (read-only)** |
| Super-System apply | **GATED / NOT ENABLED** |
| Observability-triggered refund | **Forbidden** |
| Observability-triggered fulfill | **Forbidden** |
| Observability-triggered env change | **Forbidden** |

---

## 11. Approval-gated remediation model

| Remediation | Approval gate |
|-------------|---------------|
| Dashboard/alert config in prod | OBS-G2 |
| Live-money drill | OBS-G3 / G-04 — **BLOCKED** |
| Rollback execute | IC + SRE |
| Credential rotate | G-01 |
| Self-healing apply | G-10 |

---

## 12. Current gaps

| Gap | Impact | Status |
|-----|--------|--------|
| No prod dashboard PNGs | Cannot claim OBS proven | **PENDING EVIDENCE** |
| No alert drill receipts | Cannot claim alerting proven | **PENDING EVIDENCE** |
| No 30d SLO report | Cannot claim SLO attainment | **PROPOSED / NOT PROVEN** |
| Staging-only money proof | Prod money blind spot | **NOT PROVEN IN PRODUCTION** |
| Drills not executed | IR runbook unproven | **NOT EXECUTED** |

---

## 13. Exit criteria (Gate 3 control plane)

Gate 3 observability controls may be considered **exit-ready** only when:

1. All **P0** controls (CTRL-G3-001…012, 019…021) show **EVIDENCE FILED** in manifest.
2. Minimum alert drills (A-01, A-02, A-04 or A-05, A-07) have ticket-linked receipts.
3. Money-path prod monitors filed OR explicit **BLOCKED** acceptance with NO-GO maintained.
4. Rollback drill `OBS-RB-001` and `OBS-RB-002` filed.
5. SRE/Ops placeholder sign-off row `OBS-SIGN-001` **APPROVAL REQUIRED** — not satisfied by docs alone.

**Current Gate 3 status:** **PENDING EVIDENCE** — matrix filed; controls **NOT PROVEN** in production.

---

*Gate 3 Control Matrix · placeholder roles only · not production-ready*
