# STR-02 PR72 Post-Merge Vercel Route Evidence

**Date:** 2026-05-24
**Scope:** Docs/evidence only - read-only post-merge Vercel route surface gate
**Related PR:** PR #72 - `fix(stripe): expose staging webhook route from root deployment`

**Policy:** No deploy, no redeploy, no Vercel settings edit, no env edit, no Stripe resend/replay/test event, no Vercel/Stripe API call, no DB/payment/wallet/order mutation.

---

## Purpose

Register the evidence needed to determine whether the PR #72 merged implementation appears on the latest Vercel deployment route surface.

This folder does **not** prove the fix. It records read-only dashboard evidence from local operator-provided screenshots.

---

## Evidence Status

| Evidence ID | Filename | Status |
|-------------|----------|--------|
| PR72-D01 | `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-001.png` | **CAPTURED** |
| PR72-D02 | `VERCEL-PR72-DEPLOYMENT-OVERVIEW-SOURCE-COMMIT-002.png` | **CAPTURED** |
| PR72-D03 | `VERCEL-PR72-BUILD-OUTPUT-003.png` | **CAPTURED** |
| PR72-D04 | `VERCEL-PR72-BUILD-OUTPUT-MIDDLE-004.png` | **MISSING / NOT PROVIDED** |
| PR72-D05 | `VERCEL-PR72-DEPLOYMENT-FUNCTIONS-ROUTES-005.png` | **CAPTURED** |
| PR72-D06 | `VERCEL-PR72-LOGS-WEBHOOK-STRIPE-SEARCH-006.png` | **CAPTURED** |
| PR72-D07 | `VERCEL-PR72-LOGS-STRIPE-SEARCH-007.png` | **CAPTURED** |
| PR72-D08 | `VERCEL-PR72-DOMAIN-MAPPING-008.png` | **CAPTURED** |
| PR72-S01 | `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-004.png` | **CAPTURED / SUPPLEMENTAL** |

**Coverage:** 8 local PNGs ingested; 7 of 8 expected slots captured; 1 supplemental deployment-list screenshot captured. The expected build-output-middle screenshot was not present in `C:\Users\ahmad\Downloads\PR72`.

---

## Interpretation Boundary

| Observation | Allowed interpretation |
|-------------|------------------------|
| `/api/webhooks/stripe` visible in Functions/Resources | **PARTIAL DEPLOYMENT EVIDENCE** only |
| Deployment source `main` `d274a82` / PR #74 visible | **DEPLOYMENT SOURCE EVIDENCE** only |
| `/webhooks/stripe` runtime log search has no results | **NO REQUEST OBSERVED / NO RUNTIME CORRELATION** |
| `stripe` runtime log search has no results | **NO REQUEST OBSERVED / NO RUNTIME CORRELATION** |
| HTTP 200 observed only after separately approved probe/resend | May be recorded only if actually captured |

---

## Conservative Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** - PR #72 |
| Static route bridge verification | **PASS** |
| Deployed Vercel route surface | **PARTIAL DEPLOYMENT EVIDENCE CAPTURED** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*PR72 post-merge route evidence - screenshots ingested - no HTTP proof claim*
