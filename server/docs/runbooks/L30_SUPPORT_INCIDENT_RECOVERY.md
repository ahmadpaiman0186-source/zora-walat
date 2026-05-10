# L30 — Support incident recovery runbook

**Audience:** Support (L1/L2), ops, on-call engineering.  
**Companion:** [`L29_OBSERVABILITY_INCIDENT_RESPONSE.md`](./L29_OBSERVABILITY_INCIDENT_RESPONSE.md) (technical detection), [`L30_SUPPORT_RECOVERY_OVERVIEW.md`](../support/L30_SUPPORT_RECOVERY_OVERVIEW.md), [`INCIDENT_SCENARIOS.md`](./INCIDENT_SCENARIOS.md).

**Global rules**

- **Forbidden unless explicitly allowed** in [`L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md`](../support/L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md): refunds, webhook replay, fulfillment retry, env changes, DB restore, alert silence.
- **Customer comms:** use [`L30_CUSTOMER_COMMUNICATION_TEMPLATES.md`](../support/L30_CUSTOMER_COMMUNICATION_TEMPLATES.md); no internal system names or secrets.
- **Evidence:** ticket id, **suffixes** of correlation ids, timestamps — full PAN, webhook signing secrets, and raw JWTs **never** in tickets.

---

## Runbook template fields (all sections below)

Each scenario uses: **Detection · Severity · First 5 minutes · Diagnostics · Allowed actions · Forbidden actions · Escalation · Customer communication · Evidence · Rollback/retry notes · Closure criteria**

---

## 1. API outage / app unavailable

| Field | Guidance |
|-------|----------|
| **Detection** | Customer cannot reach app; status page or synthetics fail; spike in “cannot pay” tickets |
| **Severity** | Sev-1 / engineering P0 |
| **First 5 minutes** | Confirm scope (all users vs region); check vendor status; link related tickets to one **incident** parent |
| **Diagnostics** | Engineering: `GET /health`, deploy timeline, Vercel/platform incidents — support does not SSH |
| **Allowed actions** | Send outage acknowledgement template; pause SLA clocks per policy; collect affected user count (approximate) |
| **Forbidden actions** | Promising restoration time; toggling env; asking customers for passwords |
| **Escalation** | On-call immediately; L29 observability playbook parallel |
| **Customer communication** | Outage acknowledgement + “we are investigating” (no ETA unless comms lead approves) |
| **Evidence** | Time range, synthetic screenshot (if available), ticket volume snapshot |
| **Rollback/retry notes** | Deploy rollback is **engineering**; support tracks customer impact list only |
| **Closure criteria** | Service restored; comms sent; incident review scheduled if Sev-1 |

---

## 2. /ready degraded

| Field | Guidance |
|-------|----------|
| **Detection** | Internal alert or engineering reports degraded readiness; partial features fail (e.g. checkout 503) |
| **Severity** | Sev-1 if checkout blocked; Sev-2 if background only |
| **First 5 minutes** | Confirm whether **new** checkouts are blocked (`PAYMENTS_LOCKDOWN_MODE` / prelaunch behavior per `DEPLOYMENT_READINESS.md`) |
| **Diagnostics** | Engineering: authenticated `GET /ready` JSON, `readinessReason` — support does not call with live tokens unless trained |
| **Allowed actions** | If checkouts blocked, use outage or “payment temporarily unavailable” template |
| **Forbidden actions** | Instructing customers to retry rapidly (may amplify load) |
| **Escalation** | On-call; provider/DB sub-escalation per reason |
| **Customer communication** | Fulfillment delayed / payment unavailable variant — honest, no internal cause |
| **Evidence** | Customer-facing error message text (user-provided), time |
| **Rollback/retry notes** | Same as API outage — rollback is engineering-owned |
| **Closure criteria** | `/ready` green per engineering; confirm checkouts succeed on smoke test |

---

## 3. Payment captured but no fulfillment

| Field | Guidance |
|-------|----------|
| **Detection** | Customer charged (receipt) but airtime/data not applied; `stuckSignals` / recon hints |
| **Severity** | Sev-2 (Sev-1 if volume) |
| **First 5 minutes** | Collect **order reference** (user-visible), last 4 of payment method if policy allows, approximate time |
| **Diagnostics** | Engineering/L2: `GET /api/admin/reconciliation/phase1-fulfillment`, owner `GET /api/orders/:id/phase1-truth`, Stripe PI `succeeded` |
| **Allowed actions** | Confirm ticket data; escalate with correlation suffixes; **payment pending investigation** template |
| **Forbidden actions** | Manual provider send outside system; SQL updates; DLQ replay without dual approval per authority matrix |
| **Escalation** | On-call if queue/worker down; finance if double-capture suspected |
| **Customer communication** | Payment pending / fulfillment delayed templates |
| **Evidence** | Order id **suffix**, PI id **suffix**, Stripe `evt_` suffix if customer shares email receipt |
| **Rollback/retry notes** | Replay only via approved admin APIs per `INCIDENT_SCENARIOS.md` — never “retry payment” without confirming PI state |
| **Closure criteria** | Order terminal **FULFILLED** or documented refund/exception; customer notified |

---

## 4. Fulfillment stuck / failed

| Field | Guidance |
|-------|----------|
| **Detection** | Processing timeout; `fulfillment_failed` class; provider reference missing |
| **Severity** | Sev-2 |
| **First 5 minutes** | Distinguish **invalid MSISDN** (user error) vs provider outage |
| **Diagnostics** | Canonical order: `financialAnomalySupportLines`, `failure_intelligence` / customer-visible codes per `TRUST_API_CONTRACT.md` |
| **Allowed actions** | If user error, request corrected number per template; if systemic, escalate |
| **Forbidden actions** | Promising automatic retry when `manualReviewRequired` |
| **Escalation** | L28 provider owner if mass; engineering if kill-switch invoked |
| **Customer communication** | Fulfillment delayed; request more info if MSISDN issue |
| **Evidence** | Attempt count summary (not raw provider payloads) |
| **Rollback/retry notes** | Kill switches (`FULFILLMENT_DISPATCH_KILL_SWITCH`) are **ops/engineering** only with comms plan |
| **Closure criteria** | Terminal fulfillment state or refund path agreed |

---

## 5. Provider unavailable

| Field | Guidance |
|-------|----------|
| **Detection** | Many failures same window; `/ready` Reloadly diagnostics; internal “circuit” messaging |
| **Severity** | Sev-1 if broad; Sev-2 if partial |
| **First 5 minutes** | Stop blaming user devices; open incident if > N failures / 15 min |
| **Diagnostics** | Engineering correlates with provider status; L2 may compare sandbox vs live mismatch warnings in logs |
| **Allowed actions** | Provider outage template; pause marketing sends if directed |
| **Forbidden actions** | Switching live/sandbox credentials — **never** support |
| **Escalation** | Provider TAM + engineering |
| **Customer communication** | Provider outage / delayed fulfillment — no vendor name required; “partner carrier systems” acceptable if approved |
| **Evidence** | Approximate geography, failure timestamps |
| **Rollback/retry notes** | Recovery = provider restoration + queue drain — tracked in engineering incident |
| **Closure criteria** | Error rate normalized; backlog reconciled |

---

## 6. Stripe webhook duplicate / replay

| Field | Guidance |
|-------|----------|
| **Detection** | Customer claims double charge; engineering sees duplicate replay logs; unusual `StripeWebhookEvent` pattern |
| **Severity** | Sev-1 if duplicate **capture** possible |
| **First 5 minutes** | **Freeze** narrative — do not admit fault until Stripe PI count verified |
| **Diagnostics** | `completedByWebhookEventId`, Stripe charges count for customer; `PHASE1_INCIDENT_PLAYBOOK.md` duplicate section |
| **Allowed actions** | Escalate immediately with customer email + time window |
| **Forbidden actions** | Refunding both charges without finance; deleting webhook rows |
| **Escalation** | Finance + engineering lead |
| **Customer communication** | Payment pending investigation; no double-refund language |
| **Evidence** | Stripe customer-visible receipt ids (suffix), order references |
| **Rollback/retry notes** | No webhook “replay” from support consoles |
| **Closure criteria** | Single valid charge confirmed or refund policy executed with approval |

---

## 7. Refund / dispute received

| Field | Guidance |
|-------|----------|
| **Detection** | Customer requests refund; bank dispute email; Stripe dispute object |
| **Severity** | Sev-2 (dispute may be Sev-1 for high value — finance sets) |
| **First 5 minutes** | Log ticket type `REFUND_DISPUTE`; **do not** promise outcome |
| **Diagnostics** | Stripe Dashboard: charge, dispute stage; in-app: `postPaymentIncident` placeholder per `PHASE1_REFUND_AND_DISPUTE.md` |
| **Allowed actions** | Collect documentation; route to finance; send refund/dispute received template |
| **Forbidden actions** | In-app buttons that do not exist; legal advice |
| **Escalation** | Finance; L31 if fraud pattern |
| **Customer communication** | Refund/dispute received + timelines policy (business days, not technical) |
| **Evidence** | Charge id suffix, dispute id suffix, customer statement snippet (redacted) |
| **Rollback/retry notes** | N/A — financial instrument handled in Stripe |
| **Closure criteria** | Stripe outcome recorded in finance system; customer notified |

---

## 8. Customer reports missing balance / top-up

| Field | Guidance |
|-------|----------|
| **Detection** | “Money gone / not received” — may be fulfillment delay, user error, or fraud |
| **Severity** | Sev-2 |
| **First 5 minutes** | Verify **which** order reference; distinguish login vs payment |
| **Diagnostics** | Canonical order + Stripe PI; wallet ledger docs if wallet scope — engineering path |
| **Allowed actions** | Investigation template; escalate if recon flags |
| **Forbidden actions** | Crediting wallet without approval |
| **Escalation** | Engineering if ledger anomaly; L31 if account compromise suspected |
| **Customer communication** | Payment pending investigation; resolved case when known |
| **Evidence** | Screenshots (redacted), order ref |
| **Rollback/retry notes** | Ledger fixes are **append-only** discipline — no support SQL |
| **Closure criteria** | Explanation + compensation only per policy |

---

## 9. Account / access / OTP email issue

| Field | Guidance |
|-------|----------|
| **Detection** | Cannot log in; OTP not received |
| **Severity** | Sev-3 (Sev-2 if widespread email provider block) |
| **First 5 minutes** | Check spam; verify email address on file (partial); no password reset social engineering |
| **Diagnostics** | Engineering: auth logs, email provider bounce — support collects user agent + time |
| **Allowed actions** | Account access template; identity verification per **L31** policy when defined |
| **Forbidden actions** | Manually setting passwords; merging accounts without process |
| **Escalation** | Security if takeover suspected |
| **Customer communication** | Account access issue + request for more info |
| **Evidence** | Email domain, approximate attempts |
| **Rollback/retry notes** | N/A |
| **Closure criteria** | User can authenticate or account locked with documented reason |

---

## 10. Ledger / reconciliation mismatch

| Field | Guidance |
|-------|----------|
| **Detection** | Engineering alert `missing_ledger`, `RECONCILIATION_REQUIRED`, finance internal check |
| **Severity** | Sev-1 / P0 |
| **First 5 minutes** | Support **stops** mass customer promises; switch to incident mode |
| **Diagnostics** | Engineering + finance only: recon endpoints, ledger invariants doc |
| **Allowed actions** | L1 acknowledges tickets; links to single incident |
| **Forbidden actions** | Any manual money movement; “we’ll fix your row” |
| **Escalation** | Engineering lead + finance; L29 noise control only via approved silence |
| **Customer communication** | Generic investigation only until root scope known |
| **Evidence** | Internal recon export hash — not in customer ticket body |
| **Rollback/retry notes** | DB restore per L25 — not support-run |
| **Closure criteria** | Recon green + finance sign-off + affected customers notified |

---

## 11. DB restore escalation

| Field | Guidance |
|-------|----------|
| **Detection** | Catastrophic data loss risk; engineering declares restore; L25 gate invoked |
| **Severity** | Sev-1 |
| **First 5 minutes** | Support holds comms until incident commander approves external message |
| **Diagnostics** | Infra executes `BACKUP_RESTORE_DRILL.md` path — not support |
| **Allowed actions** | Prepare customer list export request (PII-minimal) for comms lead |
| **Forbidden actions** | Running restore scripts; connecting to prod DB |
| **Escalation** | DBA / infra owner; executive comms if user-visible data loss |
| **Customer communication** | Outage / investigation only until facts known |
| **Evidence** | Incident timeline, RTO/RPO actuals post-event |
| **Rollback/retry notes** | Post-restore: reconcile queues vs DB per drill §7 |
| **Closure criteria** | `/ready` green; recon passes; postmortem scheduled |

---

## 12. Fraud / security escalation to L31

| Field | Guidance |
|-------|----------|
| **Detection** | Velocity abuse, stolen cards, account takeover, phishing reports |
| **Severity** | Sev-2 → Sev-1 if ongoing loss |
| **First 5 minutes** | Do **not** accuse customer; preserve logs; freeze narrative |
| **Diagnostics** | L31 playbook (when published): device history, IP cohorts — engineering-led |
| **Allowed actions** | Escalate ticket with **FRAUD_SECURITY** type; minimal customer data in shared channels |
| **Forbidden actions** | Blocking users without documented criteria |
| **Escalation** | Security on-call; law enforcement only via counsel |
| **Customer communication** | Neutral “under review” — no fraud accusation |
| **Evidence** | Structured escalation form fields per taxonomy |
| **Rollback/retry notes** | Rate limits / WAF — engineering |
| **Closure criteria** | Security case disposition; customer notified if required by policy |

---

## Revision

Update when PR #4 (ready timeouts), PR #5 (dispute webhook), PR #6 (L29 docs merge) change operational behavior — without merging, treat as **pending** capability.
