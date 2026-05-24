# G-02 — Operator Dashboard Action Boundary

**Date:** 2026-05-23
**Gate:** G-02 · **NOT EXECUTED**
**Parent:** [ROUTING_PACKET](./ZORA_WALAT_G02_APPROVAL_DECISION_ROUTING_PACKET_2026_05_23.md)

---

## 1. Purpose

Define what a **human operator** may do in the Stripe Dashboard **only after explicit G-02 approval**, versus what **Agent / automation must never do**, and the distinction between **dashboard-only** actions and **code / API** actions.

---

## 2. Human operator — allowed only after explicit approval

| ID | Action | Channel | Preconditions |
|----|--------|---------|---------------|
| OP-01 | Open Stripe Sandboxes → Workbench → Webhooks | Dashboard | Approval phrase issued |
| OP-02 | Complete **Create event destination** for staging URL | Dashboard | [Decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) **APPROVED** |
| OP-03 | Select `checkout.session.expired` (minimum) | Dashboard | Test-mode only |
| OP-04 | Capture **DEST-01** screenshot | Dashboard | After destination created |
| OP-05 | Later: resend test-mode event (replay) | Dashboard | Separate replay approval scope; STR-01 baseline |
| OP-06 | Capture STR / LOG evidence PNGs | Dashboard + Vercel | Per [runbook](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md) |
| OP-07 | Remove sandbox destination after test | Dashboard | Per [rollback plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) |

**Endpoint (only allowed URL):** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`

---

## 3. Agent — must never do

| Action | Status |
|--------|--------|
| Create Stripe webhook destination | **FORBIDDEN** |
| Click **Continue** / **Add destination** | **FORBIDDEN** |
| Replay / resend Stripe events | **FORBIDDEN** |
| Call Stripe API (REST, CLI, SDK) | **FORBIDDEN** |
| Call Vercel API or trigger deploy | **FORBIDDEN** |
| Edit `.env` or Vercel env vars | **FORBIDDEN** |
| Rotate credentials / secrets | **FORBIDDEN** |
| Mutate DB / payment / refund / wallet / order | **FORBIDDEN** |
| Mark approval as granted in repo | **FORBIDDEN** |
| Claim fix proven or production-ready | **FORBIDDEN** |

---

## 4. Dashboard-only vs code / API

| Category | Examples | G-02 policy |
|----------|----------|-------------|
| **Dashboard-only (operator, post-approval)** | Create sandbox destination; view Events; Resend delivery | Allowed **only** after explicit approval phrase |
| **Code / API (Agent or CI)** | `stripe webhook_endpoints create`; Vercel deploy; env sync scripts | **FORBIDDEN** for G-02 without separate approved scope |
| **Documentation (Agent)** | Ap786 markdown; evidence manifests | **Allowed** — no execution side effects |

---

## 5. Forbidden actions (all parties until approved)

| Forbidden | Applies to |
|-----------|------------|
| Live Stripe mode | Operator + Agent |
| Production endpoint | Operator + Agent |
| Real money (checkout, charge, refund) | Operator + Agent |
| Replay without approval | Operator + Agent |
| Env mutation | Operator (Gate 4) + Agent |
| Deploy | Operator + Agent |
| Secret rotation | Operator (Gate 4) + Agent |
| DB / payment mutation | Operator + Agent |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 6. Verdict

| Item | Status |
|------|--------|
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Action boundary · operator gated · Agent forbidden · no execution authorized*
