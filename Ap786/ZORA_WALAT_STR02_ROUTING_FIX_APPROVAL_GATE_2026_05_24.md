# STR-02 — Routing Fix Implementation Approval Gate

**Date:** 2026-05-24
**Gate:** G-02 · STR-02 routing fix sub-gate
**Type:** **Approval definition only — NOT an implementation record**

**Policy:** This document defines what a human approver must authorize **before** any agent or engineer opens the implementation branch and writes routing-fix code. Filing this pack **does not** grant approval. **No fix is implemented by this pack.**

---

## 1. Current evidence baseline (post PR #70)

| Item | Status |
|------|--------|
| `main` | Clean and synced after PR #70 |
| STR-02 sandbox resend | **404 ERR / Not Found** (executed once) |
| Vercel deploy **Fa18u4Nr** (`main` / **bc5dec9** / PR #69) | **Ready** — functions list **without** `/webhooks/stripe` |
| Vercel runtime logs | **NO MATCH** for `"/webhooks/stripe"` or `stripe` (VRC-D07/D07B) |
| Root Directory | **`./`** (not `server`) — **strengthens H2** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

**Evidence:** [Vercel diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md) · [404 investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md) · [verdict matrix](./ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md)

---

## 2. Purpose

Authorize **only** the next bounded step: prepare and land a **minimal staging webhook routing fix** in source control for human review — **not** deploy, **not** Stripe replay, **not** production claims.

**Pack map:**

| Doc | Role |
|-----|------|
| [Implementation plan](./ZORA_WALAT_STR02_ROUTING_FIX_IMPLEMENTATION_PLAN_2026_05_24.md) | Options A–D (evaluate only) |
| [Risk register](./ZORA_WALAT_STR02_ROUTING_FIX_RISK_REGISTER_2026_05_24.md) | Risks — all **OPEN** |
| [Rollback plan](./ZORA_WALAT_STR02_ROUTING_FIX_ROLLBACK_PLAN_2026_05_24.md) | Revert boundaries |
| [Test and evidence plan](./ZORA_WALAT_STR02_ROUTING_FIX_TEST_AND_EVIDENCE_PLAN_2026_05_24.md) | Post-implementation verification |
| [Approval checklist](./ZORA_WALAT_STR02_ROUTING_FIX_APPROVAL_CHECKLIST_2026_05_24.md) | Pre-implementation boxes |

---

## 3. Proposed implementation branch (name only — not created)

```text
fix/str02-404-webhook-routing-staging-2026-05-24
```

**Rule:** Branch must **not** be created until §4 approval phrase is issued by a designated human approver.

---

## 4. Required explicit approval phrase

A human approver must issue the following phrase **verbatim** (ticket, chat, or decision record — **not** pre-filled in git by Agent):

```text
APPROVE STR-02 STAGING WEBHOOK ROUTING FIX IMPLEMENTATION ONLY
```

| Rule | Detail |
|------|--------|
| **Scope of phrase** | Local inspection + **minimal** staging webhook routing fix code + local tests + **PR for review** |
| **Without phrase** | Implementation **BLOCKED** — treat as **NOT APPROVED** |
| **Agent may not issue** | Phrase must come from designated human approver |
| **Informal “start” insufficient** | e.g. “شروع کن” ≠ approval |

---

## 5. What this approval **DOES** allow (after phrase issued)

| # | Allowed action |
|---|----------------|
| A-01 | Read-only / local **source-code inspection** (repo route inventory, `server/vercel.json`, root `vercel.json`) |
| A-02 | **Minimal** code/config change on implementation branch targeting **staging webhook route exposure** |
| A-03 | **Local** tests (unit/integration as applicable; no live Stripe) |
| A-04 | Open **PR** for human review — **no merge claim** in Agent report |

---

## 6. What this approval **DOES NOT** allow

| # | Forbidden action |
|---|------------------|
| F-01 | **Deploy** or **redeploy** to Vercel (any environment) |
| F-02 | **Vercel dashboard** settings changes (Root Directory, framework, domains) |
| F-03 | **Env var** edits (Vercel, Neon, local secrets injection to shared env) |
| F-04 | **Stripe** Resend, replay, test event, or live-mode operation |
| F-05 | **Vercel / Stripe API** calls from automation |
| F-06 | **DB / payment / refund / wallet / order** mutation |
| F-07 | **Production** endpoint or **live mode** |
| F-08 | **Real-money** operation or controlled pilot |
| F-09 | Claim **fix proven**, **root cause confirmed**, or **production-ready** |
| F-10 | **Self-healing apply** enablement |
| F-11 | Second STR-02 Resend (requires **separate** phrase: `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY`) |

---

## 7. Prerequisites before implementation (all required)

| # | Prerequisite | Status |
|---|--------------|--------|
| P-01 | PR #70 merged; Vercel diagnostics **CAPTURED** (VRC-D01…D07B) | **FILED** |
| P-02 | [404 investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md) reviewed | **VERIFY HUMAN** |
| P-03 | [Implementation plan](./ZORA_WALAT_STR02_ROUTING_FIX_IMPLEMENTATION_PLAN_2026_05_24.md) reviewed | **VERIFY HUMAN** |
| P-04 | [Risk register](./ZORA_WALAT_STR02_ROUTING_FIX_RISK_REGISTER_2026_05_24.md) reviewed | **VERIFY HUMAN** |
| P-05 | [Rollback plan](./ZORA_WALAT_STR02_ROUTING_FIX_ROLLBACK_PLAN_2026_05_24.md) reviewed | **VERIFY HUMAN** |
| P-06 | [Test/evidence plan](./ZORA_WALAT_STR02_ROUTING_FIX_TEST_AND_EVIDENCE_PLAN_2026_05_24.md) reviewed | **VERIFY HUMAN** |
| P-07 | [Approval checklist](./ZORA_WALAT_STR02_ROUTING_FIX_APPROVAL_CHECKLIST_2026_05_24.md) completed | **PENDING** |
| P-08 | **Explicit approval phrase** (§4) issued | **NOT ISSUED** |

---

## 8. Downstream gates (after implementation PR — separate approvals)

| Gate | Approval | Status |
|------|----------|--------|
| Staging **deploy** | Separate deploy approval — **not** in this phrase | **NOT AUTHORIZED** |
| STR-02 **Resend** | `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY` | **NOT AUTHORIZED** |
| Fix-proven / prod-ready | Human review + evidence | **NOT AUTHORIZED** |

---

## 9. Verdict (conservative — unchanged)

| Item | Status |
|------|--------|
| STR-02 result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Vercel runtime correlation | **NOT FOUND** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |
| Implementation approval | **NOT ISSUED** |

---

*Routing fix approval gate · docs only · no implementation · phrase NOT ISSUED*
