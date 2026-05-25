# STR-07 Capture Matrix

**Date:** 2026-05-25
**Status:** **ALL ROWS PENDING CAPTURE**

---

## Capture Matrix

| Evidence ID | Evidence | Acceptance Criteria | Status |
|-------------|----------|---------------------|--------|
| STR07-001 | GitHub PR merge evidence for STR-06 | PR page or merge record shows STR-06 merged | **PENDING CAPTURE** |
| STR07-002 | `main` synced with STR-06 merge commit | Local/main git evidence includes STR-06 merge commit | **PENDING CAPTURE** |
| STR07-003 | Vercel staging project selected | `zora-walat-api-staging` visible | **PENDING CAPTURE** |
| STR07-004 | Latest deployment includes STR-06 merge commit | Deployment commit/SHA matches STR-06 merge | **PENDING CAPTURE** |
| STR07-005 | Vercel deployment status | Latest deployment shows `Ready` | **PENDING CAPTURE** |
| STR07-006 | Functions/Logs surface | Latest deployment has functions/logs surface available | **PENDING CAPTURE** |
| STR07-007 | Pre-probe log search | Search for `ZW_STRIPE_WEBHOOK_OBSERVABILITY` captured before new probe/event | **PENDING CAPTURE** |
| STR07-008 | Decision gate | STR-08 exact approval phrase documented as required and not yet issued | **PENDING CAPTURE** |

---

## Failure / Stop Criteria

| Condition | Required Result |
|-----------|-----------------|
| STR-06 PR not merged | Stop; do not proceed to STR-08 |
| `main` not synced with STR-06 | Stop; do not proceed to STR-08 |
| Vercel deployment does not include STR-06 | Stop; do not proceed to STR-08 |
| Deployment not Ready | Stop; do not proceed to STR-08 |
| Wrong Vercel project selected | Stop; recapture correct project |
| Any operator performs deploy/replay/probe during STR-07 | Mark evidence contaminated / inconclusive |

---

## Conservative Verdict

STR-07 has no runtime proof. All rows are **PENDING CAPTURE**, and the fix remains **NOT FULLY PROVEN**.

---

*Capture matrix - pending evidence only*
