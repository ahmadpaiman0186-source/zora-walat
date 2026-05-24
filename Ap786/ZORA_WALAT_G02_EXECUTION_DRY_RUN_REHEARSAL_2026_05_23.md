# G-02 — Execution Dry-Run Rehearsal

**Date:** 2026-05-23
**Gate:** G-02
**Status:** **DRY RUN ONLY / EXECUTION NOT AUTHORIZED**
**Merged:** PR #61 — G-02 approver review packet on `main`
**Parent:** [APPROVER_REVIEW_PACKET](./ZORA_WALAT_G02_APPROVER_REVIEW_PACKET_2026_05_23.md)

**Policy:** Dry-run documentation only. **No approval granted.** **No dashboard or API action executed.**

---

## 1. Executive summary

This pack **rehearses on paper** the future operator flow from G-02 approval through evidence capture. It prepares operators to avoid live-mode, production endpoint, replay-before-baseline, deploy, env mutation, and payment/DB changes.

**PR #61** approver review docs are on `main`. **G-02 execution dry-run: FILED / EXECUTION NOT AUTHORIZED.** User message “شروع کن” is **not** approval — see [execution not authorized notice](./ZORA_WALAT_G02_EXECUTION_NOT_AUTHORIZED_NOTICE_2026_05_23.md).

---

## 2. Dry-run declaration

| Statement | Status |
|-----------|--------|
| This is dry-run documentation only | **YES** |
| No approval granted | **YES** |
| No Stripe dashboard action executed | **YES** |
| No Vercel API or deploy executed | **YES** |
| No replay/resend executed | **YES** |
| No env / DB / payment mutation | **YES** |

---

## 3. Future execution prerequisites (not satisfied today)

| # | Prerequisite | Current status |
|---|--------------|----------------|
| E-01 | G-02 approver review complete | **PENDING REVIEW / NOT APPROVED** |
| E-02 | G-02 approval decision **APPROVED** | **PENDING / NOT APPROVED** |
| E-03 | Explicit phrase: `APPROVE G-02 SANDBOX WEBHOOK DESTINATION SETUP ONLY` | **NOT ISSUED** |
| E-04 | [Pre-execution checklist](./ZORA_WALAT_G02_PRE_EXECUTION_READINESS_CHECKLIST_2026_05_23.md) completed | **PENDING** |
| E-05 | [Sandbox mode verification](./ZORA_WALAT_G02_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_23.md) completed | **PENDING** |
| E-06 | [Execution gate](./ZORA_WALAT_G02_POST_APPROVAL_EXECUTION_GATE_2026_05_23.md) all prerequisites | **NOT MET** |

---

## 4. Exact future endpoint (documented only)

| Field | Value |
|-------|-------|
| **URL** | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| **Vercel project** | `zora-walat-api-staging` |
| **Stripe mode** | **Sandbox / test-mode only** |
| **Production endpoint** | **NOT USED** |

---

## 5. Dry-run operator sequence (paper only)

| Phase | Dry-run action | Real execution | Evidence |
|-------|----------------|----------------|----------|
| 0 | Review approval docs; confirm phrase **not** issued | **DO NOT PROCEED** | — |
| 1 | Walk through [sandbox mode checklist](./ZORA_WALAT_G02_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_23.md) | Verify Sandboxes visible | Unchecked boxes |
| 2 | Rehearse destination URL paste — staging only | Create destination **only after approval** | DEST-01 planned |
| 3 | Rehearse event obtain / expire flow | No real checkout until approved | STR-01 planned |
| 4 | Rehearse STR-01 before any Resend | **No Resend** in dry-run | STR-01 |
| 5 | Rehearse STR-02 after single Resend | **No Resend** in dry-run | STR-02 |
| 6 | Rehearse Vercel log queries ±15 min | **No log pull via API** | LOG-01…04 |
| 7 | Optional LOG-05 duplicate rehearsal | **Skip in dry-run** | LOG-05 optional |
| 8 | Review [evidence acceptance criteria](./ZORA_WALAT_G02_EVIDENCE_ACCEPTANCE_CRITERIA_2026_05_23.md) | Conservative verdict only | — |
| 9 | Confirm [NO-GO reconfirmation](./ZORA_WALAT_G02_NO_GO_RECONFIRMATION_2026_05_23.md) | Prod/pilot still NO-GO | — |

Full live runbook (future): [OPERATOR_RUNBOOK](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md)

---

## 6. Related dry-run documents

| Document | Role |
|----------|------|
| [SANDBOX_MODE_VERIFICATION_CHECKLIST](./ZORA_WALAT_G02_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_23.md) | Pre-execution mode checks |
| [SCREENSHOT_CAPTURE_MAP](./ZORA_WALAT_G02_SCREENSHOT_CAPTURE_MAP_2026_05_23.md) | Filename + redaction map |
| [OPERATOR_MISTAKE_PREVENTION_MATRIX](./ZORA_WALAT_G02_OPERATOR_MISTAKE_PREVENTION_MATRIX_2026_05_23.md) | Mistake → abort |
| [EVIDENCE_ACCEPTANCE_CRITERIA](./ZORA_WALAT_G02_EVIDENCE_ACCEPTANCE_CRITERIA_2026_05_23.md) | Sufficient vs insufficient proof |
| [NO_GO_RECONFIRMATION](./ZORA_WALAT_G02_NO_GO_RECONFIRMATION_2026_05_23.md) | Launch gates unchanged |

---

## 7. Verdict

| Item | Status |
|------|--------|
| G-02 execution dry-run | **FILED / EXECUTION NOT AUTHORIZED** |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Dry-run rehearsal · paper only · PR #61 merged · no execution authorized*
