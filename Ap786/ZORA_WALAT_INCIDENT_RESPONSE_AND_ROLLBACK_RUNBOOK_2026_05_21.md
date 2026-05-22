# Zora-Walat — Incident Response and Rollback Runbook

**Date:** 2026-05-21
**Status:** **PLAN / RUNBOOK** — drills **PENDING EVIDENCE**
**Audience:** Incident commander (IC), SRE on-call, payments safety, security
**Companion:** [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md) · [ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md](./ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md) · **Gate 3 drills:** [ZORA_WALAT_GATE3_INCIDENT_ROLLBACK_DRILL_EVIDENCE_CHECKLIST_2026_05_22.md](./ZORA_WALAT_GATE3_INCIDENT_ROLLBACK_DRILL_EVIDENCE_CHECKLIST_2026_05_22.md)

**Safety:** This runbook uses **placeholders** and **approval gates** only. It does **not** authorize autonomous Stripe refunds, webhook replays, DB writes, env changes, wallet credits, fulfillment, production deploy, or self-healing apply.

---

## 1. Purpose

Provide a **production-grade**, **fail-closed** incident response and rollback procedure for Zora-Walat that:

- Detects via observability + Super-System read-only tools
- Triages without mutating money state without approval
- Contains customer impact
- Rolls back deployments **manually** with verification
- Files sanitized evidence in `Ap786/evidence/observability-2026-05-21/`

**Not claimed:** This runbook being exercised in production (**drills PENDING**).

---

## 2. Severity matrix

| Level | Definition | Examples | Response target | IC required? |
|-------|------------|----------|-----------------|--------------|
| **SEV1** | Money-path integrity or data corruption risk | Duplicate PAID, unpaid fulfill, webhook down, refund anomaly | < 15 min acknowledge; stop deploy | **Yes** |
| **SEV2** | Customer-visible outage or severe degradation | API 5xx, frontend down, p95 SLO breach | < 30 min acknowledge | Yes if prolonged |
| **SEV3** | Elevated abuse / non-critical errors | Abuse spike, elevated 4xx | Business hours | No |
| **SEV4** | CI/Guard failure on `main` | secrets:scan fail, zw-doctor strict fail | Before merge | No |

| Auto-action from alerts | Allowed? |
|-------------------------|----------|
| Page on-call | **Yes** (when configured — **NOT PROVEN** in prod) |
| Stripe refund / replay | **No** |
| DB fix / migration | **No** |
| Self-healing apply | **No** (G-10) |
| Env / credential change | **No** |

---

## 3. Incident command roles

| Role | Responsibility | Primary |
|------|----------------|-----------|
| **Incident Commander (IC)** | Scope, severity, communications, stop deploy | On-call lead |
| **SRE** | Logs, metrics, rollback execution (placeholder) | On-call engineer |
| **Payments safety** | Money-path triage; Stripe Dashboard read-only | Payments owner |
| **Engineering** | Code fix branch; CI verification | Service owner |
| **Security** | Credential incidents; G-01 gate | Security lead |
| **Comms** | Customer/status page (template §15) | IC or delegate |

---

## 4. Detection sources

| Source | Use | Mutates prod? |
|--------|-----|---------------|
| Pager / Slack alerts | Primary prod (**NOT PROVEN** wired) | No |
| Synthetic monitors | Uptime (**PENDING EVIDENCE**) | No |
| Stripe Dashboard | Webhook delivery, payment events | No (read) |
| APM / logs | Triage (**PENDING EVIDENCE**) | No |
| `zw-doctor incidents --strict` | Enum classification | **No** |
| `zw-doctor diagnose` | Read-only health summary | **No** |
| Super-System Guard (CI) | Pre-merge regression | No |
| Operator `status-check` (staging) | Enum proof — **not** default prod | Harness only |

---

## 5. Triage workflow

```text
Alert/Page → Acknowledge (ticket INC-XXXX)
  → Classify severity (§2)
  → IC assigned if SEV1/SEV2
  → Gather: time range, deploy SHA, alert ID, metric panels
  → zw-doctor incidents (read-only) — paste enums to ticket
  → Contain (§14) — stop deploy; no money mutation
  → Mitigate OR rollback (§12–§13)
  → Verify health/synthetics (placeholders)
  → Evidence → Ap786/evidence/observability-2026-05-21/drills/
  → PIR (§16) within 5 business days
```

| Step | Forbidden without gate |
|------|------------------------|
| Stripe refund | G-03 / G-11 |
| Webhook replay | G-02 |
| DB migration | G-07 |
| Credential rotation execute | G-01 |
| Self-healing apply | G-10 |
| Production deploy fix | Release gate + IC approval |

---

## 6. Money-path incident workflow

**Trigger:** SEV1 alerts A-04, A-05, A-06 or Stripe Dashboard anomaly.

| Step | Action | Gate |
|------|--------|------|
| 1 | IC declares SEV1 money incident | — |
| 2 | Stop all production deploys | IC |
| 3 | Capture enums via `status-check` / logs (**suffix-only** order refs) | Read-only |
| 4 | Stripe Dashboard: webhook delivery, recent events | Read-only |
| 5 | Classify: duplicate PAID vs unpaid fulfill vs webhook 5xx | IC + payments |
| 6 | **Do not** auto-refund or auto-replay | **Always** |
| 7 | Mitigation plan documented in ticket | G-02/G-03/G-11 if needed |
| 8 | Verify metrics return to baseline | SRE |
| 9 | File `drill-sev1-money-*` or real PIR | Evidence |

---

## 7. Duplicate transaction incident workflow

| Step | Action |
|------|--------|
| 1 | Confirm `DUPLICATE_PAYMENT_WEBHOOK` or duplicate PAID metric |
| 2 | Identify order suffix(es) — **no** full PII in ticket |
| 3 | Check fulfillment count via operator enum (staging reference: L-4/L-5) |
| 4 | **Do not** issue second fulfillment or wallet credit without IC + payments |
| 5 | L-13 duplicate **refund** proof is **BLOCKED** until G-02 — do not execute ad hoc |
| 6 | Root cause: idempotency key, replay, ordering — document in PIR |

---

## 8. No-pay-no-service incident workflow

| Step | Action |
|------|--------|
| 1 | Alert `UNPAID_FULFILLMENT_ATTEMPT` or manual report |
| 2 | Verify gate denial logs (`OBS-LOG-GATE-001` pattern) |
| 3 | Confirm fulfillment did **not** terminal-success without PAID |
| 4 | If fulfillment occurred: **SEV1** — stop deploy; IC + payments |
| 5 | Remediation: gated DB review per G-07 — **no** agent autonomous fix |
| 6 | Customer comms: no service until payment confirmed (template §15) |

---

## 9. Payment webhook incident workflow

| Symptom | Triage | Mitigation (gated) |
|---------|--------|------------------|
| Webhook 5xx spike | Check deploy SHA, error logs (redacted) | Rollback API (§12) |
| Signature failures | Clock skew, endpoint URL, secret rotation **plan** | G-01 — **no** env edit without approval |
| Unmatched events | L-7 behavior — fast-ack | Review logs; **no** replay without G-02 |
| Delayed processing | Queue depth, function cold start | Scale review — manual |

**Placeholder verification:**

```bash
# READ-ONLY — replace placeholders
curl -sS "https://<PROD_API_HOST>/api/health"
curl -sS "https://<PROD_API_HOST>/api/ready"
```

---

## 10. DB incident workflow

| Scenario | Action | Gate |
|----------|--------|------|
| Connection pool exhaustion | Scale / connection limits review | SRE + IC |
| Migration failure | **Stop** — no forward migrate in prod | G-07 |
| Data drift suspicion | Read-only queries via approved tool | DBA + IC |
| Corruption suspected | Fail-closed — disable risky paths via feature flag (if exists) | IC |

**Forbidden:** Agent or CI running `prisma migrate` on production without G-07 approval record.

---

## 11. Credential incident workflow

| Step | Action | Gate |
|------|--------|------|
| 1 | Suspected leak: IC + security | — |
| 2 | Rotate **plan** only — `P0_OPERATOR_AUTH_CREDENTIAL_ROTATION_PLAN.md` | — |
| 3 | Execute rotation | **G-01** — human phrase + ticket |
| 4 | Verify LOGIN_HTTP / operator auth enums | Read-only |
| 5 | **No** commit of `.env*` to repo | Always |

---

## 12. Production deploy incident workflow

| Step | Action |
|------|--------|
| 1 | IC stops further deploys on SEV1/SEV2 |
| 2 | Identify `DEPLOYMENT_ID_BAD` vs `DEPLOYMENT_ID_GOOD` (placeholders) |
| 3 | Choose rollback (§13) or forward fix |
| 4 | Forward fix requires CI green + Guard + IC approval |
| 5 | Post-deploy: synthetics + health (placeholders) |

---

## 13. Rollback decision tree

```text
Customer impact or SLO burn?
├─ No → Continue triage; monitor
└─ Yes → Deploy-related regression suspected?
    ├─ No → Money-path playbook (§6–§8); DB (§10)
    └─ Yes → Which surface?
        ├─ API only → API rollback (§14.1)
        ├─ Frontend only → Frontend rollback (§14.2)
        ├─ Both → API first, then frontend (IC order)
        └─ Schema involved → STOP — G-07 staging rollback first; IC required
```

---

## 14. Rollback command placeholders only

### 14.1 API rollback (manual — Vercel placeholder)

```bash
# PLACEHOLDER — requires human approval + IC sign-off
# Do NOT run from autonomous agents.

# 1. Identify deployments (Vercel dashboard or CLI with operator credentials)
#    CURRENT_DEPLOYMENT_ID=<DEPLOYMENT_ID_BAD>
#    ROLLBACK_TARGET_ID=<DEPLOYMENT_ID_GOOD>

# 2. Execute rollback via approved operator interface:
#    vercel rollback <ROLLBACK_TARGET_ID> --project=<VERCEL_PROJECT> --yes
#    (exact flags per org policy — document actual command in drill record)

# 3. Verify
curl -sS "https://<PROD_API_HOST>/api/health"
curl -sS "https://<PROD_API_HOST>/api/ready"
# npm run zw:doctor -- summary --strict  # read-only, from approved workstation
```

### 14.2 Frontend rollback (manual — placeholder)

```bash
# PLACEHOLDER — frontend deployment rollback via Vercel dashboard
# ROLLBACK_TARGET_ID=<FRONTEND_DEPLOYMENT_ID_GOOD>

# Verify synthetics
curl -sS -o /dev/null -w "%{http_code}" "https://<PROD_FRONTEND_HOST>/"
curl -sS -o /dev/null -w "%{http_code}" "https://<PROD_FRONTEND_HOST>/success"
curl -sS -o /dev/null -w "%{http_code}" "https://<PROD_FRONTEND_HOST>/cancel"
```

### 14.3 Schema rollback

**BLOCKED** for autonomous execution. Requires **G-07**, staging proof, DBA + IC written approval. No placeholder command listed intentionally.

---

## 15. Customer impact containment

| Action | When | Auto? |
|--------|------|-------|
| Stop production deploy | SEV1/SEV2 | Manual (IC) |
| Disable checkout (feature flag) | Money-path uncontrolled risk | Manual — **if** flag exists |
| Rate-limit abuse | SEV3 abuse spike | In-app limits may apply |
| Status page update | SEV2+ customer visible | Manual comms |
| Refund batch | Never auto | G-03/G-11 only |

---

## 16. Audit log requirements

Every SEV1/SEV2 incident ticket must record:

| Field | Example |
|-------|---------|
| `incident_id` | `INC-2026-05-21-001` |
| `severity` | SEV1 |
| `start_utc` | ISO timestamp |
| `deploy_sha` | git SHA (no secrets) |
| `alert_ids` | A-04, A-06 |
| `zw_doctor_enums` | pasted classification enums |
| `actions_taken` | rollback placeholder executed — **no** secret commands |
| `gates_used` | G-02, G-07, or **none** |
| `customer_impact` | enum estimate |
| `evidence_path` | `Ap786/evidence/observability-2026-05-21/drills/...` |

---

## 17. Communications template

**Internal (Slack #incidents):**

```text
[SEV{X}] Zora-Walat — <one-line summary>
IC: <name> | Start: <UTC> | Impact: <customer/API/money>
Status: Investigating | Deploy stopped: Yes/No
Do NOT discuss secrets or full order IDs in this channel.
```

**External (status page / email — redacted):**

```text
We are investigating an issue affecting <scope>. Payments and top-up delivery
may be delayed. We have not confirmed unauthorized charges. Updates every <N> min.
Reference: <PUBLIC_INCIDENT_ID>
```

**Forbidden in external comms:** “All systems secure,” “100% uptime,” “QA passed,” “production-ready.”

---

## 18. Post-incident review template

```markdown
# PIR — INC-XXXX — YYYY-MM-DD

## Summary
(one paragraph)

## Timeline (UTC)
- T+0: ...
- T+N: ...

## Root cause
(technical, no secrets)

## Money-path impact
duplicate / unpaid fulfill / none — evidence enums

## What went well

## What went wrong

## Action items
| ID | Action | Owner | Due | Gate |
|----|--------|-------|-----|------|

## Evidence filed
- [ ] OBS-DRILL-* or production PIR path in Ap786

## Claim check
- [ ] No false "production-ready" or "QA PASS" in comms
```

---

## 19. Self-repair apply gate

| Condition | Allowed? |
|-----------|----------|
| Alert fired | Detect only |
| zw-doctor proposes repair | Document in ticket |
| `ZW_SELF_HEALING_APPLY=true` | **Only** with G-10 written approval |
| Money-path repair apply | **Forbidden** default |
| CI zw-doctor | **Read-only** — proven |

Reference: [ZORA_WALAT_SUPER_SYSTEM_SELF_REPAIR_AND_OPERATIONS_SIGNOFF_2026_05_21.md](./ZORA_WALAT_SUPER_SYSTEM_SELF_REPAIR_AND_OPERATIONS_SIGNOFF_2026_05_21.md).

---

## 20. Forbidden auto-repair actions

| Action | Reason |
|--------|--------|
| Stripe refund / partial refund | Irreversible money |
| Stripe webhook replay | State drift |
| Wallet credit | Customer balance |
| Service fulfillment | Deliverable value |
| Prisma migrate (prod) | Schema integrity |
| Env / API key rotation | Blast radius |
| Production deploy / rollback | Customer exposure — **human only** |
| `selfHealingApplyRepairs` on money incidents | G-10 |

---

## 21. Approval matrix

| Operation | Gate | Approvers | Auto from alert? |
|-----------|------|-----------|------------------|
| Rollback API/FE | Release + IC | SRE + IC | **No** |
| Webhook replay | G-02 | Payments + IC | **No** |
| Refund execute | G-03/G-11 | Payments + IC | **No** |
| DB migrate prod | G-07 | CTO + DBA | **No** |
| Credential rotate | G-01 | Security + ops | **No** |
| Live-money mode | G-04 | CTO + payments | **No** |
| Self-healing apply | G-10 | CTO | **No** |
| Enable prod alerting | OBS-G3 | SRE + payments | **No** |

---

## 22. Drill checklist

| # | Drill | Environment | Evidence ID | Status |
|---|-------|-------------|-------------|--------|
| 1 | SEV2 tabletop (API down scenario) | process | `OBS-DRILL-SEV2-001` | **PENDING EVIDENCE** |
| 2 | SEV1 money (duplicate webhook simulation) | staging | `OBS-DRILL-SEV1-001` | **PENDING EVIDENCE** |
| 3 | Alert test to pager | staging/prod | `OBS-ALERT-TEST-001` | **PENDING EVIDENCE** |
| 4 | API rollback | staging | `OBS-RB-API-001` | **PENDING EVIDENCE** |
| 5 | Frontend rollback | staging | `OBS-RB-FE-001` | **PENDING EVIDENCE** |
| 6 | PIR template completed for drill | process | `OBS-DRILL-PIR-001` | **PENDING EVIDENCE** |
| 7 | Comms template dry-run | process | `OBS-DRILL-COMMS-001` | **PENDING EVIDENCE** |
| 8 | zw-doctor incidents enum capture | CLI | — | **PARTIAL** |

**Cadence (proposed):** Quarterly SEV2 tabletop; semi-annual SEV1 staging money drill.

---

## 23. Related documents

| Document | Role |
|----------|------|
| [SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md](./SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md) | Prior workflow |
| [GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md](./GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md) | G-01…G-11 |
| [ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md](./ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md) | Filing checklist |

---

*Incident Response and Rollback Runbook · placeholders only · drills PENDING · not production-ready*
