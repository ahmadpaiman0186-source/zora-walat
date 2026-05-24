# Zora-Walat — G-02 Staging Webhook Destination Unblock Approval

**Date:** 2026-05-23
**Gate:** **G-02** · staging sandbox/test-mode only
**Status:** **APPROVAL REQUIRED / NOT EXECUTED**
**Parent evidence:** [STAGING_STRIPE_WEBHOOK_REPLAY_PROOF_PR55](./ZORA_WALAT_STAGING_STRIPE_WEBHOOK_REPLAY_PROOF_PR55_2026_05_23.md) · [evidence folder](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md)

**Policy:** Documentation only. No dashboard actions, deploy, replay, env mutation, or money-path changes without filed approval.

---

## 1. Executive summary

PR #55 (Track H) is **merged to `main`**. Staging deployment proof (DEP-01) and **both sandbox blockers** (BLK-01, BLK-02) are **filed**. **G-02 staging replay remains BLOCKED / INCONCLUSIVE** because:

1. No sandbox webhook destination is registered to the staging endpoint (BLK-01).
2. No deliverable `checkout.session.expired` event deliveries exist in the current sandbox Events view (BLK-02).

This pack defines **approval requirements** before any operator may create a **Stripe sandbox/test-mode** webhook destination pointing at staging — and before any later gated replay proof. **Nothing in this document authorizes execution.**

---

## 2. Current blocker evidence (filed)

| ID | Artifact | Status | Establishes |
|----|----------|--------|-------------|
| **DEP-01** | `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` | **CAPTURED / REVIEW PENDING** | `zora-walat-api-staging` on **`main`**, **Ready**, PR #55+ lineage |
| **BLK-01** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.png` | **CAPTURED / BLOCKER EVIDENCE** | Operator routed to **Create an event destination**; no existing staging destination |
| **BLK-02** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-NO-EVENT-DELIVERIES-001.png` | **CAPTURED / BLOCKER EVIDENCE** | `checkout.session.expired` → **No event deliveries found** |

---

## 3. Why replay is blocked

| Blocker | Effect on G-02 |
|---------|----------------|
| BLK-01 | Stripe cannot deliver webhooks to staging without a sandbox destination |
| BLK-02 | No baseline or replayable `checkout.session.expired` delivery row for STR-01 / STR-02 |
| Missing approval | Dashboard destination create + replay are **forbidden** until [decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) is **APPROVED** |

---

## 4. Approval requirement (before any dashboard action)

| # | Requirement | Status |
|---|-------------|--------|
| A-01 | [G-02 decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) signed **APPROVED** | **PENDING / NOT APPROVED** |
| A-02 | Ticket / change window ID recorded (not in git) | **REQUIRED** |
| A-03 | [Allowed actions](./ZORA_WALAT_G02_STRIPE_SANDBOX_WEBHOOK_DESTINATION_ALLOWED_ACTIONS_2026_05_23.md) reviewed | **PENDING** |
| A-04 | [Operator runbook](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md) acknowledged | **PENDING** |
| A-05 | [Rollback / abort plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) acknowledged | **PENDING** |
| A-06 | Gate 4 credential policy reviewed if signing secret touched | **PENDING REVIEW** |

**Agents must not** create destinations, click **Continue**, replay events, or mutate env/DB.

---

## 5. Allowed endpoint (documented only)

| Field | Value |
|-------|-------|
| **URL** | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| **Host project** | `zora-walat-api-staging` (Vercel staging) |
| **Mode** | Stripe **sandbox / test-mode only** |
| **Signing secret** | Must match staging `STRIPE_WEBHOOK_SECRET` in Vercel — **name only**; never commit values |

---

## 6. Explicitly forbidden

| Action | Status |
|--------|--------|
| Live Stripe mode | **FORBIDDEN** |
| Production webhook endpoint | **FORBIDDEN** |
| Real-money checkout / refund / wallet / order mutation | **FORBIDDEN** |
| `.env` / Vercel env edits from Agent | **FORBIDDEN** |
| Credential rotation without Gate 4 approval | **FORBIDDEN** |
| Deploy (production or staging) from Agent | **FORBIDDEN** |
| DB / payment / refund / wallet / order mutation | **FORBIDDEN** |
| Automatic or Agent-initiated replay | **FORBIDDEN** |
| Self-healing apply | **GATED / NOT ENABLED** |
| Claim fix proven or production-ready | **FORBIDDEN** |

---

## 7. Related G-02 pack documents

| Doc | Role |
|-----|------|
| [ALLOWED_ACTIONS](./ZORA_WALAT_G02_STRIPE_SANDBOX_WEBHOOK_DESTINATION_ALLOWED_ACTIONS_2026_05_23.md) | Operator vs Agent boundaries |
| [OPERATOR_RUNBOOK](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md) | Phased future execution |
| [EVIDENCE_MATRIX](./ZORA_WALAT_G02_STAGING_REPLAY_EVIDENCE_MATRIX_2026_05_23.md) | All evidence IDs + status |
| [ROLLBACK_ABORT](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) | Stop / rollback |
| [DECISION_RECORD](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) | Approval gate form |

---

## 8. Verdict

| Item | Status |
|------|--------|
| **G-02 sandbox webhook destination setup** | **APPROVAL REQUIRED / NOT EXECUTED** |
| **Staging replay** | **BLOCKED / INCONCLUSIVE** |
| **Fix proven** | **NOT YET** |
| **Production launch** | **NO-GO** |
| **Real-money launch** | **NO-GO** |
| **Controlled pilot** | **NO-GO** |
| **Self-healing apply** | **GATED / NOT ENABLED** |

---

*G-02 unblock approval pack · plan only · no execution authorized*
