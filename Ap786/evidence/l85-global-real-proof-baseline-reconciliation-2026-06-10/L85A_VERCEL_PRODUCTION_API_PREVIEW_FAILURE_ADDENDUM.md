# L-85A — Vercel production API preview failure addendum

**Verdict:** `CORE10-L85A-VERDICT-001: L85A_PRE_EXISTING_VERCEL_API_PREVIEW_FAILURE_DOCUMENTED_NO_RUNTIME_FIX`

**Date:** 2026-06-10
**Scope:** Ap786-only triage addendum for PR #219 — **no runtime fix**

---

## Context

PR #219 (L-85 global real-proof baseline reconciliation) reported one failing GitHub commit status from the Vercel GitHub integration on the **production API** project. Read-only triage was performed without opening Vercel logs, without Vercel CLI, and without mutating runtime.

---

## PR and commit references

| Field | Value |
|-------|--------|
| **PR** | **#219** |
| **Branch** | `evidence/l85-global-real-proof-baseline-reconciliation-2026-06-10` |
| **Commit** | `f25174e1a0be0b7358b2a1f5602b92cd9696fb26` |
| **Base (main)** | `dad111152bc6e9b8b19441808cf80a0ae0ee83c8` (`dad1111` — L-84N PR #218 merged) |

---

## Failing check (PR #219 HEAD)

| Field | Value |
|-------|--------|
| **Exact check name** | `Vercel – zora-walat-api` |
| **State** | `failure` |
| **Description** | `Deployment has failed` |
| **Failed project** | **`zora-walat-api`** (production API Vercel project) |
| **PR deployment ref** | `dpl_HTQFRkQFinHsE3AUkcF2GJFT9KpK` |

---

## Pre-existing failure on main (same project)

| Field | Value |
|-------|--------|
| **Main commit** | `dad111152bc6e9b8b19441808cf80a0ae0ee83c8` (`dad1111`) |
| **Same check name** | `Vercel – zora-walat-api` |
| **State** | `failure` |
| **Main deployment ref** | `dpl_5FsUSvA12KLzXVt1MBzDjcPWAPpG` |

The production API Vercel status was **already failing on `origin/main` before L-85 docs-only changes**.

---

## Other checks on PR #219 (read-only summary)

**GitHub Actions (success):** `guard`, `server`, `flutter`, `Vercel Preview Comments`

**Vercel commit statuses (success on PR HEAD):** `Vercel – zora-walat`, `Vercel – zora-walat-mj41`, `Vercel – zora-walat-api-staging`

Only **`Vercel – zora-walat-api`** failed on PR #219.

---

## L-85 diff scope (no runtime change)

| Check | Result |
|-------|--------|
| L-85 changed only Ap786 files | **YES** — 12 files |
| server/app/runtime changed | **NO** |
| `.env` changed | **NO** |
| `.vercel` in tree | **NO** |
| `secrets:scan` | **OK** |

L-85 did not modify server build inputs. Vercel still triggers linked monorepo preview deploys on push; **`zora-walat-api` preview failed on unchanged server tree** relative to main.

---

## Causality verdict

**`PRE_EXISTING_PRODUCTION_API_VERCEL_PREVIEW_FAILURE_NOT_CAUSED_BY_L85`**

This is a **pre-existing production API Vercel preview/deploy failure**, not an L-85 documentation regression.

---

## L-85 evidence impact

**`NO IMPACT TO AP786-ONLY RECONCILIATION`**

L-85 ledger, classification matrix, rejection register, and readiness verdict remain valid. Failed Vercel preview does not constitute L-85 proof and does not invalidate the reconciliation package.

Parent verdict unchanged: `CORE10-L85-VERDICT-001: L85_GLOBAL_REAL_PROOF_BASELINE_RECONCILED_NO_COMMERCIAL_READINESS`

---

## Runtime proof

**NO** — this addendum documents a failed deploy status only. No runtime execution, HTTP proof, webhook proof, or operational verification was performed.

---

## Readiness upgrade

**NO** — production, controlled pilot, global launch, real-money, and runtime readiness are **not** upgraded by this filing.

| Item | Status |
|------|--------|
| L-74 | **OPEN** |
| L-84 retry | **NOT AUTHORIZED** |
| Global launch | **NO-GO** |

---

## Root cause

**NOT PROVEN** — Vercel deployment logs were not opened; Vercel CLI/inspect was not used; Vercel project settings were not mutated. Likely layer: **`zora-walat-api` Vercel project build/deploy/environment** — separate from L-85 Ap786 scope. Exact failure mode **unknown** in this addendum.

---

## Recommended future action

Resolve only under a **separate operational L** after **explicit operator approval**. Do **not** fix runtime inside L-85 or L-85A.

Possible future track (not authorized here): production API Vercel deploy triage on `zora-walat-api` — build logs, env/build settings review, redeploy — **outside** Ap786 reconciliation scope.

---

## Boundaries observed (L-85A execution)

| Action | Performed |
|--------|-----------|
| Ap786 addendum filed | **YES** |
| PR #219 merged | **NO** |
| Redeploy | **NO** |
| Vercel logs / inspect / CLI | **NO** |
| Vercel settings mutation | **NO** |
| server/app/runtime change | **NO** |
| HTTP / Stripe / provider API / DB / payment flow | **NO** |
| Secret inspection | **NO** |

---

## Final verdict

**`CORE10-L85A-VERDICT-001: L85A_PRE_EXISTING_VERCEL_API_PREVIEW_FAILURE_DOCUMENTED_NO_RUNTIME_FIX`**

---

*End.*
