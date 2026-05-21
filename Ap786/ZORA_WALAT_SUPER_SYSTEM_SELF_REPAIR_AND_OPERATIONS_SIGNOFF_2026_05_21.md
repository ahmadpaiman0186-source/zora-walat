# Zora-Walat — Super-System Self-Repair and Operations Sign-off

**Date:** 2026-05-21  
**Audience:** CTO, SRE, incident command, payments safety, security auditors  
**Main baseline:** `986c552` — PR #35 merged (frontend evidence only; **no** Super-System code change in that PR)  
**Status:** **PLAN / DESIGN / GATED ONLY** — **not** operational sign-off for production auto-repair  
**Policy:** Detect and propose by default; **apply disabled** on money, credentials, DB, production.

---

## 1. Super-System objective

Establish a **production-grade control loop** for Zora-Walat:

```text
Detect → Classify → Contain → Repair-plan → Approval gate → Apply (if allowed) → Verify → Evidence → Rollback
```

**Today:** Strong **detection** and **documentation** (zw-doctor, Guard CI, incident taxonomy, Ap786). **Apply** on dangerous surfaces is **intentionally blocked**. Production APM is **plan only**.

**This document does not enable** self-healing apply, production deploy, or any money mutation.

---

## 2. Detection coverage

| Signal class | Detector (today) | Production live? | Evidence |
|--------------|------------------|------------------|----------|
| CI secret patterns | `secrets:scan` in Guard | **Yes (CI)** | Guard workflow |
| Static architecture drift | `zw-doctor` strict | **Yes (CI)** | Control plane proof |
| Incident taxonomy | `zw-doctor incidents` | **Yes (CLI)** | Incident workflow doc |
| Health / ready | `GET /api/health`, `/ready` | **PARTIAL** | Endpoints exist |
| Money-path integration tests | L-1…L-11 harness | **Staging test mode** | Ap786 proofs |
| Frontend route regression | CI + manual | **PARTIAL** | PR #23–#35 visuals |
| Production synthetic uptime | — | **NOT PROVEN** | Observability plan |
| Live duplicate-refund mirror | L-13 checklist | **NOT EXECUTED** | BLOCKED |

---

## 3. Fail-closed policy

| Condition | Required behavior | Auto-action allowed? |
|-----------|-------------------|----------------------|
| Payment status unknown / pending | No fulfillment; no wallet credit | **No** |
| Webhook signature invalid | Reject; no state advance | **No** |
| Unmatched Stripe event | Fast-ack + log; no orphan PAID | **No** |
| Duplicate webhook (staging proven) | Idempotent handling | **No** auto refund |
| Operator auth invalid | 401; no privileged reads | **No** |
| Self-healing proposal on money path | Block apply | **No** |

**Principle:** Ambiguity **denies** service and **denies** autonomous repair.

---

## 4. Auto-detection controls

| Control | Implementation status | Notes |
|---------|----------------------|-------|
| G-06 secrets scan on PR | **ACTIVE** | CI |
| Super-System Guard | **ACTIVE** | No repo secrets required |
| zw-doctor propose-only | **ACTIVE** | No money mutations |
| Abuse spike signal (`webtopIncidentSignals`) | **PARTIAL (code)** | Export to APM **NOT PROVEN** |
| SLA breach fields (schema) | **PARTIAL** | Operational use **NOT PROVEN** in prod |
| Fraud detection service | **PARTIAL (code)** | Production tuning **NOT PROVEN** |

---

## 5. Auto-repair design (plan only)

| Repair class | Design intent | Apply today |
|--------------|---------------|-------------|
| Re-run read-only diagnostics | Safe | **Allowed (CLI)** |
| Open incident ticket with enum evidence | Safe | **Human** |
| Feature-flag traffic shed | Contain | **Human approval** |
| Replay Stripe webhook | Money | **FORBIDDEN without G-02** |
| Execute refund | Money | **FORBIDDEN without G-03/G-11** |
| Prisma migration / DB write | Data | **FORBIDDEN without G-07** |
| Env / credential change | Security | **FORBIDDEN without G-01/G-09** |
| Wallet credit / fulfillment | Money | **FORBIDDEN** |
| Production deploy | Ops | **FORBIDDEN without release gate** |
| `ZW_SELF_HEALING_APPLY` | System | **DISABLED** default |

Reference: [SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md](./SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md), [GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md](./GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md).

---

## 6. Self-healing apply gate

| Gate | Requirement | Current state |
|------|-------------|---------------|
| **G-10** Self-healing apply | Written approval + scope + rollback | **BLOCKED** — `SELF_HEALING_APPLY_ALLOWED false` |
| Money-path repair | Payments owner + incident commander | **Never auto** |
| Credential rotation execute | Security + ops + G-01 phrase | **BLOCKED** |
| L-12 / L-13 execution | G-03 / G-02 | **BLOCKED / PENDING** |

**Agents and CI must not** set `ZW_SELF_HEALING_APPLY=true` or call `selfHealingApplyRepairs` without recorded human approval.

---

## 7. Safe rollback plan

| Incident type | Rollback action | Auto? | Verify |
|---------------|-----------------|-------|--------|
| Bad API deploy | Vercel rollback to prior deployment | **Manual** | health/ready 200 |
| Bad frontend deploy | Vercel rollback Next | **Manual** | `/` 200 |
| Schema bad migrate | Gated down migration | **Manual + G-07** | Staging first |
| Erroneous refund | **No auto reversal** | **Human + Stripe** | Enum proof in Ap786 |

**Automatic Vercel rollback:** **NOT PROVEN** — treat as **manual only**.

---

## 8. Incident severity matrix

| Level | Definition | Response target | Auto-repair |
|-------|------------|-----------------|-------------|
| **SEV1** | Money integrity (duplicate PAID, unpaid fulfill, webhook down) | Immediate IC + stop deploy | **Detect only** |
| **SEV2** | Customer-visible outage / severe latency | On-call < 30 min | **Contain manual** |
| **SEV3** | Abuse spike; non-terminal noise | Business hours | **Rate limits exist** |
| **SEV4** | CI/Guard red on `main` | Before next merge | **Block merge** |

Aligns with [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md) §3.

---

## 9. Money-path anomaly detection

| Anomaly | Detection (proposed/live) | Auto-response | Status |
|---------|---------------------------|---------------|--------|
| Duplicate PAID webhook | DB metrics + incident type | Alert | **PARTIAL** |
| Fulfillment without PAID | Gate denial logs | Alert | **PARTIAL** |
| Refund drift / double refund | L-11 mirror; L-13 watch | Alert | **L-11 PASS staging; L-13 PENDING** |
| Card decline storm | L-8 classifier | Alert | **PASS (staging/automation)** |
| Unmatched event flood | L-7 | Alert | **PASS (automation)** |

**No** autonomous refund, webhook replay, or fulfillment from alerts.

---

## 10. Duplicate transaction prevention boundary

| Layer | Mechanism | Proven? |
|-------|-----------|---------|
| UX | Duplicate warning on success | **Code + partial visual** |
| API / webhook | Idempotency keys; slim path | **Staging L-4/L-5** |
| Refund duplicate | L-13 checklist | **NOT EXECUTED** |
| Global guarantee | — | **NOT CLAIMED** |

---

## 11. No-pay-no-service enforcement boundary

| Layer | Enforcement | Proven? |
|-------|-------------|---------|
| UI copy | Cancel + success footnotes | **Visual + code** |
| Server gates | Fulfillment requires PAID | **Staging L-1…L-11** |
| Auto-repair | Must not credit wallet on UI alone | **BLOCKED by design** |

---

## 12. Production observability roadmap

| Milestone | Deliverable | Status |
|-----------|-------------|--------|
| O-1 | Synthetic checks for `/`, `/success`, `/cancel` | **PLAN ONLY** |
| O-2 | APM p95/p99 API routes | **PLAN ONLY** |
| O-3 | Stripe webhook 5xx dashboard | **PLAN ONLY** |
| O-4 | Money anomaly dashboards | **PLAN ONLY** |
| O-5 | Paging + on-call rotation | **PLAN ONLY** (external runbook) |

**Do not claim** production APM is live until Ap786 records implementation evidence.

---

## 13. Human approval gates

| Gate ID | Operation | Approval required |
|---------|-----------|-------------------|
| G-01 | Credential rotation **execute** | Security + ops phrase |
| G-02 | Stripe webhook replay / resend (non-harness) | Payments + IC |
| G-03 | L-12 partial refund proof execution | Payments |
| G-04 | Live-money / production Stripe mode | CTO + payments |
| G-07 | DB migration apply (prod) | CTO + DBA |
| G-09 | Production env change | CTO + security |
| G-10 | Self-healing **apply** | CTO + written scope |
| G-11 | Refund execute (non-harness) | Payments + IC |

---

## 14. What can auto-diagnose

| Item | Safe auto-diagnose? |
|------|---------------------|
| Missing env keys (local) | **Yes** — zw-doctor / UI warning |
| Guard CI failure | **Yes** — workflow |
| Health endpoint down | **Yes** — synthetic (when deployed) |
| secrets:scan hit | **Yes** — block merge |
| Incident enum classification | **Yes** — read-only |
| “Is PAID confirmed?” on success page | **Yes** — server fetch (runtime) |

---

## 15. What can auto-repair safely (bounded)

| Item | Preconditions | Default |
|------|---------------|---------|
| Re-run zw-doctor summary | Read-only | **Allowed** |
| CI retry on flake | No money touch | **Allowed in CI** |
| Rate-limit abuse (in-app) | Configured thresholds | **Allowed at runtime** |

**Everything else** requires §13 gates.

---

## 16. What must never auto-repair without approval

| Operation | Why forbidden |
|-----------|---------------|
| Stripe refunds | Irreversible money movement |
| Stripe webhook replays | State drift risk |
| Wallet credits | Customer balance impact |
| Service fulfillment | Deliverable value |
| DB writes / migrations | Data integrity |
| Env / credential changes | Blast radius |
| Production deploy | Customer exposure |
| Self-healing apply on money path | G-10 violation |

---

## 17. Sign-off checklist (operations)

| # | Item | Status | Signer | Date |
|---|------|--------|--------|------|
| 1 | Fail-closed policy acknowledged | **PENDING** | | |
| 2 | Self-healing apply remains **disabled** on money | **PENDING** | | |
| 3 | G-01…G-11 gates understood by on-call | **PENDING** | | |
| 4 | Incident severity matrix adopted | **PENDING** | | |
| 5 | Observability plan accepted as **roadmap only** | **PENDING** | | |
| 6 | L-12/L-13 not executed without approval | **PENDING** | | |
| 7 | No production deploy from this doc | **PENDING** | CTO | |
| 8 | PR #35 scope understood (evidence only) | **MET** | Engineering | 2026-05-21 |

**Operations sign-off:** **PENDING** — plan acceptance ≠ production readiness.

---

## 18. Approval gates summary table

| Gate | Operation | Auto allowed? | Evidence required |
|------|-----------|---------------|-------------------|
| G-01 | Rotation execute | **No** | Ap786 dry-run + approval record |
| G-02 | Webhook replay | **No** | L-4 style enum proof |
| G-03 | L-12 execution | **No** | New Ap786 PASS doc |
| G-04 | Live money | **No** | Production cert pack |
| G-07 | DB migrate prod | **No** | Staging migrate proof |
| G-10 | Self-heal apply | **No** | Written scope + rollback |
| — | PR #35 screenshots | **N/A** | 10/10 PNGs — **no ops apply** |

---

## 19. Next actions

| Priority | Action | Owner |
|----------|--------|-------|
| 1 | Implement O-1…O-3 observability (approved project) | SRE |
| 2 | On-call runbook outside repo | Ops |
| 3 | L-13 execution when G-02 cleared | Payments |
| 4 | Quarterly drill: zw-doctor incidents on staging | SRE |
| 5 | Re-verify `SELF_HEALING_APPLY_ALLOWED` remains false | Security |

---

## 20. Related documents

| Document | Role |
|----------|------|
| [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md) | Observability roadmap |
| [ZORA_WALAT_SUPER_SYSTEM_GLOBAL_ENFORCEMENT_PACK_2026_05_20.md](./ZORA_WALAT_SUPER_SYSTEM_GLOBAL_ENFORCEMENT_PACK_2026_05_20.md) | 30-control matrix |
| [SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md](./SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md) | Incident workflow |
| [ZORA_WALAT_STAKEHOLDER_SIGNOFF_PACK_2026_05_21.md](./ZORA_WALAT_STAKEHOLDER_SIGNOFF_PACK_2026_05_21.md) | Stakeholder matrix |

---

*Super-System operations sign-off · PLAN/GATED ONLY · self-healing apply NOT enabled · not production-ready*
