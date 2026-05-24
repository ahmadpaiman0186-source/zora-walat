# G-02 — Risk Acceptance and Boundary Review

**Date:** 2026-05-23
**Gate:** G-02
**Status:** **NOT ACCEPTED / PENDING APPROVAL**
**Parent:** [APPROVER_REVIEW_PACKET](./ZORA_WALAT_G02_APPROVER_REVIEW_PACKET_2026_05_23.md)

**Policy:** Risk review only. No risk acceptance recorded in git. **NOT ACCEPTED** until human approver sign-off.

---

## 1. Purpose

Risk register for approver review of **sandbox webhook destination setup only** (staging endpoint, test-mode). Replay and fix-proven claims are **out of scope** for this risk acceptance step unless separately approved.

---

## 2. Risk register

| ID | Risk | Severity | Description | Default status |
|----|------|----------|-------------|----------------|
| **R-G02-01** | Misrouting | High | Destination URL points to wrong host (prod vs staging) | **OPEN / NOT ACCEPTED** |
| **R-G02-02** | Live-mode accidental action | Critical | Operator selects live Stripe mode instead of sandbox | **OPEN / NOT ACCEPTED** |
| **R-G02-03** | Production endpoint accidental use | Critical | Production webhook URL entered in destination config | **OPEN / NOT ACCEPTED** |
| **R-G02-04** | Replay/resend timing | Medium | Replay attempted before DEST-01 or STR-01 baseline | **OPEN / NOT ACCEPTED** |
| **R-G02-05** | Webhook secret custody | High | Signing secret exposed in git, chat, or wrong Vercel project | **OPEN / NOT ACCEPTED** |
| **R-G02-06** | Observability / log correlation | Medium | Cannot correlate LOG-01…04 within ±15 min window | **OPEN / NOT ACCEPTED** |
| **R-G02-07** | Rollback / abort | Medium | Partial create without documented removal path | **OPEN / NOT ACCEPTED** |

**Overall risk acceptance:** **NOT ACCEPTED / PENDING APPROVAL**

---

## 3. Risk detail and mitigations

### R-G02-01 — Misrouting

| Mitigation | Operator check |
|------------|----------------|
| Pre-exec checklist confirms exact URL | [checklist](./ZORA_WALAT_G02_PRE_EXECUTION_READINESS_CHECKLIST_2026_05_23.md) |
| DEST-01 screenshot must show staging URL | Evidence matrix |
| Ticket records endpoint verbatim | [ticket template](./ZORA_WALAT_G02_APPROVAL_TICKET_TEMPLATE_2026_05_23.md) |

### R-G02-02 — Live-mode accidental action

| Mitigation | Operator check |
|------------|----------------|
| Sandboxes / test-mode visible in capture | Dashboard toggle in DEST-01 |
| Forbidden in [action boundary](./ZORA_WALAT_G02_OPERATOR_DASHBOARD_ACTION_BOUNDARY_2026_05_23.md) | Abort if live mode detected |

### R-G02-03 — Production endpoint accidental use

| Mitigation | Operator check |
|------------|----------------|
| Only allowed URL documented | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Production URL **FORBIDDEN** | Pre-exec checklist |

### R-G02-04 — Replay/resend timing

| Mitigation | Operator check |
|------------|----------------|
| Destination create scoped separately from replay | Explicit phrase scope |
| STR-01 before any resend | [runbook](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md) |

### R-G02-05 — Webhook secret custody

| Mitigation | Operator check |
|------------|----------------|
| Gate 4 if Vercel env touched | Never commit secret |
| Name-only reference in docs | `STRIPE_WEBHOOK_SECRET` |

### R-G02-06 — Observability / log correlation

| Mitigation | Operator check |
|------------|----------------|
| ±15 min Vercel log window | LOG-01…04 capture plan |
| Abort if no correlation | [rollback plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) |

### R-G02-07 — Rollback / abort

| Mitigation | Operator check |
|------------|----------------|
| Sandbox destination removal documented | Rollback plan R-01…R-05 |
| No production rollback | Explicit boundary |

---

## 4. Operator checks (pre-execution)

- [ ] Sandbox/test-mode selected — **unchecked default**
- [ ] Staging endpoint confirmed — **unchecked default**
- [ ] Production endpoint not used — **unchecked default**
- [ ] Abort criteria reviewed — **unchecked default**
- [ ] Risk register reviewed by approver — **PENDING**

---

## 5. Verdict (default)

| Item | Status |
|------|--------|
| Risk acceptance | **NOT ACCEPTED / PENDING APPROVAL** |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Risk review · NOT ACCEPTED · no execution authorized*
