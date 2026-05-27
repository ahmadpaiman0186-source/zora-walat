# STR-12 PR #87 Vercel Rate-Limit Blocker Registration

**Date:** 2026-05-27
**PR:** **#87** — `feat(stripe): add STR-12 non-money webhook audit trail`
**Branch:** `feat/str12-durable-non-money-webhook-audit-2026-05-25`
**Commit SHA (STR-12):** `755d848`
**Evidence folder:** [evidence/str12-pr87-vercel-rate-limit-blocker-2026-05-27/](./evidence/str12-pr87-vercel-rate-limit-blocker-2026-05-27/README.md)
**Status:** **BLOCKED / EXTERNAL VERCEL DEPLOYMENT RATE LIMIT**

---

## 1. Purpose

Register an external platform blocker preventing STR-12 PR #87 from reaching merge-ready status. This document is evidence and governance only. It does not authorize merge, deploy, Vercel action, Stripe action, or readiness claims.

---

## 2. Blocker summary

| Field | Value |
|-------|-------|
| Blocker ID | **STR12-PR87-VERCEL-RL-001** |
| Domain | CI / deploy platform (Vercel) |
| PR | **#87** |
| Root cause class | **EXTERNAL_PLATFORM_RATE_LIMIT / NOT_CODE_FAILURE** |
| Code failure proven | **NO** |
| Merge override authorized | **NO** |
| Safe operator action | **WAIT** — retry only after Vercel rate-limit window clears and GitHub shows required checks green |

---

## 3. GitHub check state (operator-captured)

| Check | Result |
|-------|--------|
| CI / flutter (`pull_request`) | **PASSED** |
| CI / server (`pull_request`) | **PASSED** |
| Super-System Guard / guard (`pull_request`) | **PASSED** |
| Vercel — zora-walat-api | **FAILED** |
| Vercel — zora-walat-api-staging | **FAILED** |
| Vercel — zora-walat-mj41 | **FAILED** |
| Merge conflicts with base branch | **NONE** (per operator GitHub UI) |

### 3.1 Failed Vercel checks (detail)

| Check name | Failure message |
|------------|-----------------|
| Vercel — zora-walat-api | Deployment rate limited — retry in 24 hours |
| Vercel — zora-walat-api-staging | Deployment rate limited — retry in 24 hours |
| Vercel — zora-walat-mj41 | Deployment rate limited — retry in 24 hours |

---

## 4. Operator observation timeline

| Observation | Status |
|-------------|--------|
| Initial Vercel rate-limit message observed | **YES** — `Deployment rate limited — retry in 24 hours` |
| Operator waited more than 48 hours | **YES** |
| Blocker remains active after extended wait | **YES** |
| Code/test failure proven as cause | **NO** |
| Stale-check-only hypothesis confirmed | **NO** — failure message still cites active rate limit |

---

## 5. Evidence artifact

| Evidence ID | File | On disk | Status |
|-------------|------|---------|--------|
| STR12-PR87-001 | [evidence/str12-pr87-vercel-rate-limit-blocker-2026-05-27/STR12-PR87-VERCEL-RATE-LIMIT-48H-BLOCKER-001.png](./evidence/str12-pr87-vercel-rate-limit-blocker-2026-05-27/STR12-PR87-VERCEL-RATE-LIMIT-48H-BLOCKER-001.png) | **YES** | **CAPTURED** — documents three failing Vercel checks and passing CI/Guard checks after **>48h** operator wait |

`STR12-PR87-VERCEL-RATE-LIMIT-48H-BLOCKER-001.png` shows PR #87 check summary: CI/flutter, CI/server, and Super-System Guard green; all three listed Vercel project checks red with the same rate-limit message.

---

## 6. What this blocker does and does not prove

| Claim | Status |
|-------|--------|
| STR-12 implementation is blocked from merge by Vercel deployment rate limit | **SUPPORTED** |
| CI/flutter, CI/server, and Super-System Guard passed for PR #87 | **SUPPORTED** (per operator GitHub UI + screenshot) |
| Application code failure on PR #87 | **NOT PROVEN** |
| STR-12 durable non-money webhook audit deployed to staging/production | **NOT PROVEN** |
| STR-13 staging audit deployment or invalid-signature proof | **NOT AUTHORIZED / NOT EXECUTED** |
| Webhook processing proof gap closed | **NOT PROVEN** |
| Fix-proven status | **NOT CLAIMED** |
| Production readiness | **NOT CLAIMED** |
| Real-money readiness | **NOT CLAIMED** |
| Controlled pilot readiness | **NOT CLAIMED** |

---

## 7. Forbidden actions while blocker active

| Action | Status |
|--------|--------|
| Merge PR #87 without all required checks green | **FORBIDDEN** |
| Merge override / admin bypass | **NOT AUTHORIZED** |
| Push new commits to force Vercel green | **NOT RECOMMENDED** — may worsen rate limit |
| Vercel CLI deploy/redeploy | **FORBIDDEN** in Agent scope |
| Stripe resend/replay/probe | **NOT AUTHORIZED** |
| Claim STR-12 fix proven or deployed | **FORBIDDEN** |

---

## 8. Safe exit criteria

| Criterion | Required |
|-----------|----------|
| All three Vercel PR checks report success | **YES** |
| CI/flutter, CI/server, Super-System Guard remain green | **YES** |
| No merge conflicts with base branch | **YES** |
| Explicit human merge approval after green checks | **YES** |
| STR-13 deployment/proof gate separately approved | **YES** (post-merge; not bundled) |

---

## 9. Conservative verdict

| Item | Verdict |
|------|---------|
| STR-12 PR #87 merge readiness | **BLOCKED** |
| Primary blocker | **EXTERNAL VERCEL DEPLOYMENT RATE LIMIT** |
| Code failure | **NOT PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Fix-proven | **NOT CLAIMED** |
| Merge override | **NOT AUTHORIZED** |

---

## 10. Cross-references

| Document | Role |
|----------|------|
| [ZORA_WALAT_STR11_DURABLE_NON_MONEY_WEBHOOK_AUDIT_APPROVAL_GATE_2026_05_25.md](./ZORA_WALAT_STR11_DURABLE_NON_MONEY_WEBHOOK_AUDIT_APPROVAL_GATE_2026_05_25.md) | STR-12 approval gate definition |
| [ZORA_WALAT_STR10_WEBHOOK_PROCESSING_PROOF_GAP_DECISION_GATE_2026_05_25.md](./ZORA_WALAT_STR10_WEBHOOK_PROCESSING_PROOF_GAP_DECISION_GATE_2026_05_25.md) | Processing proof gap remains open |
| [ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md](./ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md) | Program blocker register |
| [ZORA_WALAT_G02_STR02_EVIDENCE_CAPTURE_MATRIX_2026_05_24.md](./ZORA_WALAT_G02_STR02_EVIDENCE_CAPTURE_MATRIX_2026_05_24.md) | G-02 staging webhook evidence lineage |

---

*STR-12 PR #87 Vercel rate-limit blocker registration — docs/evidence only; no deploy or merge authorized*
