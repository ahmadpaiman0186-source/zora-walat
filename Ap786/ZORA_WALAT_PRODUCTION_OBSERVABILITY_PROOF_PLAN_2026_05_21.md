# Zora-Walat — Production Observability Proof Plan

**Date:** 2026-05-21  
**Audience:** SRE, CTO, incident command, payments safety, security auditors, investors (technical)  
**Status:** **PLAN ONLY** — **NOT PROVEN** in production  
**Companion docs:** [ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md](./ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md) · [ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md](./ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md)  
**Prior roadmap:** [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md) (requirements) — **this document defines proof**, not implementation.

**Policy:** Super-System **detect/report**; self-healing **apply** **GATED / NOT ENABLED**. No autonomous money, credential, DB, or deploy mutations from observability tooling.

---

## 1. Executive status

| Dimension | Status |
|-----------|--------|
| **Production observability** | **PLAN ONLY / NOT PROVEN** |
| **Production APM** | **NOT PROVEN** |
| **Production alerting** | **NOT PROVEN** |
| **Production dashboards** | **NOT PROVEN** |
| **SLOs / SLIs** | **PROPOSED / NOT PROVEN** |
| **Synthetic checks (prod)** | **PROPOSED / NOT PROVEN** |
| **Money-path prod anomaly detection** | **PARTIAL (design/staging) / NOT PROVEN (prod)** |
| **Self-healing apply** | **GATED / NOT ENABLED** |
| **QA PASS** | **NOT CLAIMED** |
| **Production-ready** | **NOT CLAIMED** |
| **Real-money-ready** | **NOT CLAIMED** |
| **Stakeholder sign-off** | **PENDING** |

**Program intent:** Define the **exact evidence** required to upgrade observability from **PLAN ONLY** to **PROVEN (production)** without fabricating proof artifacts.

**This document did not:** modify application code, env, DB, Stripe, webhooks, deploy production, enable self-healing apply, or file fake observability screenshots.

---

## 2. Current evidence baseline after PR #35 and PR #36

| Milestone | Merge / artifact | What it proves | What it does **not** prove |
|-----------|------------------|----------------|---------------------------|
| **PR #35** | `986c552` — 10/10 investor-hard PNGs | Frontend **visual** diligence evidence | Production APM, uptime, alerts |
| **PR #36** | Stakeholder + Final QA + Super-System ops packs | Governance matrices; **PENDING** sign-off; ops **PLAN/GATED** | Live monitoring, SLO attainment |
| **Super-System Guard** | CI on `main` | `secrets:scan` + zw-doctor static | Production runtime telemetry |
| **health / ready** | API routes exist | Liveness probe **candidate** | Prod synthetic schedule, paging |
| **L-1…L-11 staging** | Ap786 harness | Test-mode money-path behavior | Production money-path under load |
| **Observability plan** | `ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md` | Required signals (design) | Implementation proof |

---

## 3. Observability proof objective

Prove — with **sanitized, filed artifacts** per [manifest](./ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md) — that production can:

1. **Detect** customer-visible and money-path failures within defined SLO windows.  
2. **Alert** the on-call rotation with actionable, low-noise pages.  
3. **Triage** using logs, metrics, traces, and Super-System read-only diagnostics.  
4. **Contain** without auto-refund, auto-fulfill, or auto-env change.  
5. **Rollback** deployments manually with recorded verification.  
6. **Govern** self-repair so **apply** remains disabled unless G-10 approval exists.

**Proof bar:** Each manifest row moves from **PENDING EVIDENCE** → **EVIDENCE FILED** only when acceptance criteria in the manifest are met.

---

## 4. What is currently proven

| Area | Evidence | Scope | Status |
|------|----------|-------|--------|
| CI secret scanning | `secrets:scan` in Guard | Repo CI | **PROVEN (CI)** |
| Static Super-System diagnostics | `zw-doctor` strict / incidents | CI + CLI read-only | **PROVEN (CI-static)** |
| Health endpoints exist | `/api/health`, `/ready` | Code/deploy config | **PARTIAL** |
| Money-path staging harness | L-1…L-11 Ap786 | **Stripe test mode** | **PROVEN (staging)** |
| Duplicate webhook idempotency (staging) | L-4/L-5 docs | Staging | **PROVEN (staging)** |
| Fail-closed UX (visual) | PR #35 PNGs + code review | Local UI capture | **PARTIAL (visual)** |
| Incident taxonomy (design) | Incident workflow doc | Documentation | **PROVEN (docs)** |
| Self-healing apply disabled | G-10; ops signoff pack | Policy | **PROVEN (policy)** |
| Frontend investor screenshots | 10/10 manifest | **Not** observability | **PROVEN (UX evidence only)** |

---

## 5. What is not proven

| Area | Status | Blocker |
|------|--------|---------|
| Production APM (latency, errors) | **NOT PROVEN** | No filed APM screenshots/export |
| Production log aggregation | **NOT PROVEN** | No redacted log sample pack |
| Distributed tracing | **NOT PROVEN** | No trace IDs in prod sample |
| Production alert routing | **NOT PROVEN** | No alert test receipt artifacts |
| Production dashboards | **NOT PROVEN** | No sanitized dashboard PNGs |
| SLO / SLI attainment | **NOT PROVEN** | No 30-day SLO report |
| Production synthetic uptime | **NOT PROVEN** | No synthetic check history |
| Prod money-path anomaly alerts | **NOT PROVEN** | Staging only |
| Prod rollback drill | **NOT PROVEN** | No drill record |
| Production observability sign-off | **NOT PROVEN** | SRE row **PENDING** |
| Live-money certification | **NOT PROVEN** | G-04 |

---

## 6. Required production telemetry

| Telemetry class | Minimum requirement | Proof artifact (manifest ID) | Status |
|-----------------|---------------------|------------------------------|--------|
| **Metrics** | RED metrics per critical route | `OBS-METRICS-RED-001` | **PENDING EVIDENCE** |
| **Logs** | Structured JSON; correlation IDs | `OBS-LOG-STRUCT-001` | **PENDING EVIDENCE** |
| **Traces** | Checkout + webhook + fulfillment span | `OBS-TRACE-MONEY-001` | **PENDING EVIDENCE** |
| **Events** | Stripe webhook outcome counters | `OBS-EVENT-WH-001` | **PENDING EVIDENCE** |
| **Synthetic** | HTTP checks prod URLs | `OBS-SYNTH-UPTIME-001` | **PENDING EVIDENCE** |
| **RUM (optional)** | Core Web Vitals sample | `OBS-RUM-CWV-001` | **PENDING EVIDENCE** |

---

## 7. Required logs

| Log stream | Required fields (redacted) | Retention (proposed) | Status |
|------------|---------------------------|----------------------|--------|
| API access | `request_id`, route, status, duration_ms | 30d | **PENDING EVIDENCE** |
| Stripe webhook | `event_type`, `event_id`, outcome, **no** raw card | 90d | **PENDING EVIDENCE** |
| Payment gate denial | gate reason enum, order suffix | 90d | **PENDING EVIDENCE** |
| Fulfillment | state transition enums | 90d | **PENDING EVIDENCE** |
| Operator actions | action enum, actor role, **no** secrets | 365d | **PENDING EVIDENCE** |
| Auth failures | result enum, IP bucket | 30d | **PENDING EVIDENCE** |

**Forbidden in filed proof:** API keys, JWTs, `DATABASE_URL`, full PAN, customer phone/email, raw webhook bodies with PII.

---

## 8. Required metrics

| Metric | Type | Alert on | Status |
|--------|------|----------|--------|
| `http_requests_total` | Counter | — | **PENDING EVIDENCE** |
| `http_request_duration_seconds` | Histogram | p95 SLO breach | **PENDING EVIDENCE** |
| `http_5xx_ratio` | Gauge | > threshold 5m | **PENDING EVIDENCE** |
| `stripe_webhook_processing_total` | Counter | failure spike | **PENDING EVIDENCE** |
| `payment_gate_denial_total` | Counter | anomaly spike | **PARTIAL** (code signal; prod export **NOT PROVEN**) |
| `fulfillment_terminal_total` | Counter | stuck non-terminal | **PENDING EVIDENCE** |
| `duplicate_payment_webhook_total` | Counter | > 0 in prod | **PENDING EVIDENCE** |
| `abuse_blocked_total` | Counter | spike (SEV3) | **PARTIAL** (in-process; prod **NOT PROVEN**) |

---

## 9. Required traces

| Trace flow | Spans (minimum) | Sampling (proposed) | Status |
|------------|-----------------|---------------------|--------|
| Top-up create | API → DB → Stripe session | 10% baseline; 100% errors | **PENDING EVIDENCE** |
| Webhook `checkout.session.completed` | HTTP → handler → DB → gate | 100% SEV1 candidates | **PENDING EVIDENCE** |
| Fulfillment tick | worker → provider → status | 10% | **PENDING EVIDENCE** |
| Success page status fetch | Next → API → classify | 5% | **PENDING EVIDENCE** |

**Proof:** One sanitized trace screenshot/export per flow with IDs redacted.

---

## 10. Required alerts

| Alert ID | Condition | Severity | Route | Auto-action | Status |
|----------|-----------|----------|-------|-------------|--------|
| A-01 | `/api/health` down 2m | SEV1 | Pager | None | **PENDING EVIDENCE** |
| A-02 | 5xx ratio > 2% 5m | SEV2 | Pager | None | **PENDING EVIDENCE** |
| A-03 | p95 latency > SLO 10m | SEV2 | Slack + pager | None | **PENDING EVIDENCE** |
| A-04 | Stripe webhook 5xx | SEV1 money | Pager + payments | **No** replay | **PENDING EVIDENCE** |
| A-05 | `UNPAID_FULFILLMENT_ATTEMPT` | SEV1 money | Pager + IC | **No** fulfill | **PENDING EVIDENCE** |
| A-06 | `DUPLICATE_PAYMENT_WEBHOOK` prod | SEV1 money | Pager + IC | **No** refund | **PENDING EVIDENCE** |
| A-07 | Synthetic check fail 3x | SEV2 | Pager | None | **PENDING EVIDENCE** |
| A-08 | Guard failed on `main` | SEV4 | CI only | Block merge | **PROVEN (CI)** |

**Alert test proof:** Fired drill alert with ticket ID — manifest `OBS-ALERT-TEST-001`.

---

## 11. Required dashboards

| Dashboard | Panels (minimum) | Audience | Status |
|-----------|------------------|----------|--------|
| **Platform overview** | Uptime, 5xx, p95, deploy version | SRE | **PENDING EVIDENCE** |
| **Money path** | Webhook outcomes, gate denials, PAID transitions | Payments + IC | **PENDING EVIDENCE** |
| **Fulfillment** | Queue depth, SLA breach, terminal states | Ops | **PENDING EVIDENCE** |
| **Security** | Auth failures, abuse blocks | Security | **PENDING EVIDENCE** |
| **Super-System** | zw-doctor last run summary (manual paste) | Engineering | **PENDING EVIDENCE** |

**Proof:** Sanitized PNG or PDF export — no customer PII, no secret values in legends.

---

## 12. Required SLOs / SLIs

| SLI | SLI definition (proposed) | SLO target (proposed) | Measurement window | Status |
|-----|---------------------------|----------------------|-------------------|--------|
| **Availability** | Synthetic success rate | 99.9% | 30d | **PROPOSED / NOT PROVEN** |
| **API latency** | p95 `POST /api/topup-orders` | < 800ms | 30d | **PROPOSED / NOT PROVEN** |
| **Webhook success** | 2xx / received (Stripe) | 99.95% | 30d | **PROPOSED / NOT PROVEN** |
| **Money integrity** | Count of SEV1 money incidents | 0 per month | 30d | **PROPOSED / NOT PROVEN** |
| **Error budget** | 1 − availability SLO | Burn rate alerting | 30d | **PROPOSED / NOT PROVEN** |

**Proof:** Monthly SLO report PDF with error budget chart — manifest `OBS-SLO-REPORT-001`.

---

## 13. Required uptime and health checks

| Check | Endpoint / target | Interval | Status |
|-------|-------------------|----------|--------|
| API liveness | `GET /api/health` | 60s | **PARTIAL** (endpoint); prod schedule **NOT PROVEN** |
| API readiness | `GET /api/ready` | 60s | **PARTIAL** |
| Frontend origin | `GET /` (prod URL) | 60s | **PENDING EVIDENCE** |
| Return routes | `GET /success`, `GET /cancel` | 5m | **PENDING EVIDENCE** |
| Stripe webhook URL | HEAD/POST probe (non-destructive) | 5m | **PENDING EVIDENCE** |

---

## 14. Required synthetic checks

| Check ID | Steps | Pass criteria | Status |
|----------|-------|---------------|--------|
| SYN-01 | GET `/` | HTTP 200; body contains product marker | **PENDING EVIDENCE** |
| SYN-02 | GET `/success` (no params) | HTTP 200; fail-closed copy present | **PENDING EVIDENCE** |
| SYN-03 | GET `/cancel` | HTTP 200 | **PENDING EVIDENCE** |
| SYN-04 | GET `/api/health` | JSON healthy | **PENDING EVIDENCE** |
| SYN-05 | GET `/api/ready` | JSON ready | **PENDING EVIDENCE** |

**Note:** PR #35 screenshots prove **local** UI rendering — **not** production synthetic history.

---

## 15. Required money-path anomaly detection

| Anomaly | Detection signal | Staging evidence | Production proof | Status |
|---------|------------------|------------------|------------------|--------|
| Duplicate PAID webhook | Counter + incident type | L-4/L-5 | Alert A-06 fired in drill | **PARTIAL / NOT PROVEN (prod)** |
| Unpaid fulfillment attempt | Gate denial metric | Code + tests | Alert A-05 | **PARTIAL / NOT PROVEN (prod)** |
| Refund drift / double refund | L-11 mirror; L-13 watch | L-11 staging | L-13 + prod alert | **PARTIAL / NOT PROVEN (prod)** |
| Webhook storm / 5xx | Stripe + app metrics | L-7 automation | A-04 | **PARTIAL / NOT PROVEN (prod)** |
| Card decline spike | L-8 classifier | Staging | Dashboard panel | **PARTIAL / NOT PROVEN (prod)** |

---

## 16. Required no-pay-no-service monitoring

| Control | Monitor | Evidence | Status |
|---------|---------|----------|--------|
| Fulfillment gate | `payment_gate_denial_total{reason=unpaid}` | Metric + sample log line | **PENDING EVIDENCE** |
| UI-only success | No fulfillment metric on `/success` alone | Architecture audit + prod sample | **PARTIAL** |
| Cancel path | Zero fulfillment after cancel | Staging L-9; prod counter | **PARTIAL / NOT PROVEN (prod)** |

---

## 17. Required duplicate-transaction monitoring

| Layer | Monitor | Staging | Production | Status |
|-------|---------|---------|------------|--------|
| Webhook idempotency | Duplicate event counter | L-4/L-5 **PASS** | A-06 + dashboard | **NOT PROVEN (prod)** |
| Refund duplicate | L-13 checklist | **NOT EXECUTED** | **BLOCKED** | **PENDING / BLOCKED** |
| UX duplicate warning | Not a metric — spot-check | Code | Synthetic optional | **PARTIAL** |

---

## 18. Required fail-closed monitoring

| Scenario | Expected prod behavior | Proof | Status |
|----------|------------------------|-------|--------|
| Unknown success session | No PAID UI; verifying state | PR #35 PNG (local) + prod synthetic SYN-02 | **PARTIAL** |
| Missing Stripe config | Warning banner (if applicable) | PR #29 PNG (local only) | **PARTIAL (local)** |
| Webhook signature fail | 4xx/401; no state advance | Log sample + metric | **PENDING EVIDENCE** |
| Operator auth fail | 401 enum | Metric + log | **PENDING EVIDENCE** |

---

## 19. Required security monitoring

| Signal | Tooling (proposed) | Status |
|--------|-------------------|--------|
| Auth failure rate | Logs + metric | **PENDING EVIDENCE** |
| Abuse block spike | `abuse_blocked_total` | **PARTIAL** |
| secrets:scan on PR | Guard | **PROVEN (CI)** |
| Dependency CVE | GitHub Dependabot / audit | **PENDING EVIDENCE** (process) |
| Credential rotation overdue | Manual checklist G-01 | **PENDING** |

---

## 20. Required audit logs

| Event | Who | Fields (redacted) | Retention | Status |
|-------|-----|-------------------|-----------|--------|
| Gated op approval | Human approver | gate ID, ticket, timestamp | 7y proposed | **PENDING EVIDENCE** |
| Deploy | Release owner | deployment ID, git SHA | 1y | **PENDING EVIDENCE** |
| Refund execute | Payments owner | order suffix, outcome enum | 7y | **PENDING EVIDENCE** |
| Rollback | SRE | from/to deployment ID | 1y | **PENDING EVIDENCE** |
| Self-healing apply attempt | System | **must be empty** unless G-10 | 1y | **POLICY: none expected** |

---

## 21. Required incident response evidence

| Artifact | Description | Status |
|----------|-------------|--------|
| Tabletop drill record | SEV2 scenario; roles exercised | **PENDING EVIDENCE** |
| SEV1 money drill record | Duplicate webhook simulation (staging) | **PENDING EVIDENCE** |
| Post-incident review (template) | Filled for drill only | **PENDING EVIDENCE** |
| Communications log | Redacted customer comms template used | **PENDING EVIDENCE** |
| zw-doctor incident output | Enum-only capture | **PARTIAL** (CLI exists) |

Runbook: [ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md](./ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md).

---

## 22. Required rollback evidence

| Drill | Steps | Proof artifact | Status |
|-------|-------|----------------|--------|
| API rollback | Rollback to `DEPLOYMENT_ID_PREVIOUS` placeholder | Rollback log + health 200 | **PENDING EVIDENCE** |
| Frontend rollback | Rollback Next deployment placeholder | SYN-01 pass | **PENDING EVIDENCE** |
| Schema rollback | **Gated G-07** — staging only first | N/A until approved | **BLOCKED** |
| Auto-rollback | — | **NOT IN SCOPE** | **NOT PROVEN** |

---

## 23. Required self-repair governance evidence

| Control | Required proof | Status |
|---------|----------------|--------|
| G-10 documented | Ops signoff pack §6 | **PROVEN (docs)** |
| `SELF_HEALING_APPLY_ALLOWED false` | zw-doctor intelligence output sample | **PARTIAL** |
| No alert→refund automation | Alert runbook explicit | **PROVEN (docs)** |
| Approval record for any apply | Ticket + approver name | **PENDING** (expect none) |

---

## 24. Required stakeholder signoff evidence

| Row | Owner | Evidence | Status |
|-----|-------|----------|--------|
| S-08 Operations / monitoring | SRE lead | Signed ops checklist referencing manifest completion | **PENDING SIGNOFF** |
| Investor observability claim | — | **Forbidden** until manifest ≥ agreed threshold | **BLOCKED** |

Reference: [ZORA_WALAT_STAKEHOLDER_SIGNOFF_PACK_2026_05_21.md](./ZORA_WALAT_STAKEHOLDER_SIGNOFF_PACK_2026_05_21.md).

---

## 25. Risk matrix

| Risk | Likelihood | Impact | Detection (target) | Residual today |
|------|------------|--------|--------------------|----------------|
| Prod outage undetected | Medium | High | SYN + A-01 | **High** — synthetics **NOT PROVEN** |
| Money-path silent failure | Low–Med | Critical | A-04–A-06 | **High** — prod alerts **NOT PROVEN** |
| Alert fatigue | Medium | Medium | Tuning playbook | **Unknown** |
| False SLO claim | Medium | High | Manifest discipline | **Mitigated** by this plan |
| Auto-repair money mutation | Low | Critical | G-10 | **Low** — apply disabled |

---

## 26. Approval gates (observability program)

| Gate | Action | Approver | Status |
|------|--------|----------|--------|
| OBS-G1 | Select APM/log vendor | CTO + SRE | **PENDING** |
| OBS-G2 | Enable production synthetics | SRE | **PENDING** |
| OBS-G3 | Enable money-path alerts | Payments + SRE | **PENDING** |
| OBS-G4 | File manifest row `EVIDENCE FILED` | SRE | **PENDING** |
| OBS-G5 | Observability sign-off (S-08) | SRE lead | **PENDING SIGNOFF** |
| G-10 | Self-healing apply | CTO | **BLOCKED** |
| G-04 | Live-money | CTO + payments | **BLOCKED** |

---

## 27. Conservative verdict

| Statement | Allowed? |
|-----------|----------|
| Observability requirements are **documented** | **Yes** |
| Production observability is **proven** | **No** |
| Production APM / alerting / dashboards are **live** | **No** (unless manifest filed) |
| SLOs are **met** | **No** |
| Project is **production-ready** | **No** |
| Project is **real-money-ready** | **No** |
| **QA PASS** | **No** |

**Overall:** Production observability proof program is **PLAN ONLY**. Engineering has **strong CI-static detection** and **staging money-path evidence**; **production telemetry proof is NOT PROVEN**. Proceed only via manifest filing and gated OBS-G1…G5 — not via doc edits alone.

---

## 28. Related documents

| Document | Role |
|----------|------|
| [ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md](./ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md) | Artifact checklist |
| [ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md](./ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md) | Response + rollback |
| [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md) | Signal requirements |
| [ZORA_WALAT_SUPER_SYSTEM_SELF_REPAIR_AND_OPERATIONS_SIGNOFF_2026_05_21.md](./ZORA_WALAT_SUPER_SYSTEM_SELF_REPAIR_AND_OPERATIONS_SIGNOFF_2026_05_21.md) | Gated repair |

---

*Production Observability Proof Plan · PLAN ONLY · NOT PROVEN · not production-ready*
