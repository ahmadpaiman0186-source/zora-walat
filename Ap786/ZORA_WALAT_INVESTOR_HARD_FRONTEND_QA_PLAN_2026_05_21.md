# Zora-Walat — Investor-Hard Frontend QA Plan

**Date:** 2026-05-21  
**Branch:** `evidence/investor-hard-frontend-qa-2026-05-21`  
**Main baseline:** `fa88b0b` — Merge PR #29 (local fail-closed screenshot evidence)  
**Audience:** Engineering, QA, product, security, investors (technical diligence)  
**Policy:** **NO_FALSE_PASS** · **NO_FALSE_PRODUCTION_CLAIM** · detect/report-only Super-System

---

## 1. Executive summary

This plan advances the **investor-hard frontend evidence phase** toward audit-safe market review. It does **not** certify production-ready, real-money ready, or full frontend QA PASS.

**What exists today (honest):**

- Merged frontend return routes + fa/ar/tr i18n (PR #23–#24)  
- Investor pass matrix, market readiness pack, Super-System enforcement pack (PR #22–#27)  
- QA scaffold under `Ap786/evidence/frontend-qa-2026-05-20/`  
- **One** real screenshot: `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` (PR #29) — **local fail-closed only**

**What does not exist yet:**

- Clean investor screenshots (Stripe configured, no missing-key banner)  
- Completed RTL/a11y smoke with filed results  
- Signed stakeholder signoff  
- Production observability proof in production

---

## 2. Current baseline (`main` after PR #29)

| Item | Value |
|------|--------|
| **HEAD** | `fa88b0b` |
| **PR #29** | Local fail-closed screenshot + manifest registration |
| **CI / Guard** | Green on `main` (operator attestation; re-capture recommended post–PR #29) |
| **Program readiness** | ~**68% PARTIAL** — not production-ready |
| **Frontend investor QA** | **PENDING EVIDENCE** (one fail-closed PNG only) |

**Canonical docs:** `ZORA_WALAT_INVESTOR_REQUIRED_PASSES_2026_05_20.md`, `ZORA_WALAT_INVESTOR_SAFE_MARKET_READINESS_PACK_2026_05_20.md`, `ZORA_WALAT_SUPER_SYSTEM_GLOBAL_ENFORCEMENT_PACK_2026_05_20.md`

---

## 3. Global Engineering Super-System requirements (this phase)

| Doctrine | Evidence expectation | Auto-repair |
|----------|----------------------|-------------|
| Auto-detect broken frontend, config gaps, unsafe claims | zw-doctor + Guard + **this QA plan** flags missing captures | **Report only** |
| Fail-closed money path | Return routes + staging L-1…L-11; screenshots for UX | **No apply** |
| Zero duplicate transaction **target** | L-4/L-5 + UX copy; L-13 still gated | **No apply** |
| No-pay-no-service | Gate + cancel/success copy; screenshot proof | **No apply** |
| No paid service without verified payment | Server PAID authority; success page behavior | **No apply** |
| Repeated unpaid access | Abuse/rate design + **PARTIAL** proof | Policy + future metrics |
| Honest evidence | No fabricated PNG, signoff, or PASS | — |

**Self-healing levels for this work:** **Level 0–1** (detect + document gaps). **Level 3+ apply forbidden** without G-10 approval.

---

## 4. Clean screenshot requirements

**Investor-clean** means:

- Stripe publishable key **configured** (staging test key acceptable)  
- **No** missing-key / payment-setup-incomplete banner on home  
- **No** secrets, full order IDs, or live-money labeling without explicit test-mode framing  
- Suffix-only order references on return pages when shown

**Not investor-clean:**

- `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` — valid as **fail-closed evidence only**

**Manifest (2026-05-21 IDs):** [evidence/frontend-qa-2026-05-20/SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md](./evidence/frontend-qa-2026-05-20/SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md)

| Status | Count |
|--------|-------|
| **SCREENSHOT CAPTURED** (investor-clean) | **0** |
| **SCREENSHOT CAPTURED (local fail-closed)** | **1** (separate ID; PR #29) |
| **PENDING CAPTURE** | **10** (investor-hard IDs) |

---

## 5. RTL / a11y QA matrix

**Overall:** **PENDING EVIDENCE** — see [RTL_A11Y_SMOKE_REVIEW.md](./evidence/frontend-qa-2026-05-20/RTL_A11Y_SMOKE_REVIEW.md) §2026-05-21.

| Area | Locales / scope | Status |
|------|-----------------|--------|
| FA layout review | FA / RTL home + return | **PENDING EVIDENCE** |
| AR layout review | AR / RTL home + return | **PENDING EVIDENCE** |
| Keyboard navigation | EN home, success, cancel | **PENDING EVIDENCE** |
| Focus visibility | Tab through nav, language, CTAs | **PENDING EVIDENCE** |
| Readable contrast | Spot-check body/notes | **PENDING EVIDENCE** |
| No text overlap | FA/AR hero and notes | **PENDING EVIDENCE** |
| Language switcher | en↔fa↔ar↔tr | **PENDING EVIDENCE** |
| Payment safety copy visible | duplicate, no-service notes | **PENDING EVIDENCE** |
| Fail-closed warning | Missing key **or** unknown success | **PARTIAL** — fail-closed PNG filed |
| Mobile responsiveness | Home + return mobile | **PENDING EVIDENCE** |

---

## 6. Investor demo pack (15 minutes)

**Environment label:** Staging **test mode** or local with **valid** Stripe test publishable key — never live-money.

| Min | Step | Show | Do not claim |
|-----|------|------|--------------|
| 0–2 | Open Ap786 README + pass matrix | Evidence discipline | Production-ready |
| 2–5 | `/` clean home (EN → FA → AR) | Language switcher, status-aware hero, anchors | Instant delivery guarantee |
| 5–8 | `#how-it-works` + `#support-guidance` | In-page trust + support guidance | Full ticketing system |
| 8–11 | `/success` no-params + optional pending | Fail-closed verifying copy | “Paid” without server PAID |
| 11–13 | `/cancel` | No service, no auto-retry | User got airtime without pay |
| 13–15 | Super-System + blockers | Guard CI, enforcement pack §3, gated L-12/L-13 | Auto-repair fixes money |

**Evidence links to cite:**

- `ZORA_WALAT_INVESTOR_SAFE_MARKET_READINESS_PACK_2026_05_20.md` §4  
- `ZORA_WALAT_SUPER_SYSTEM_GLOBAL_ENFORCEMENT_PACK_2026_05_20.md` §4–5  
- `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md`  
- `AP786_ALL_PASSES_INVESTOR_PROOF.md` (L-1…L-11 staging)

**Explain limitations honestly:**

- Production APM and alerting: **plan only** (`ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md`)  
- Frontend QA: **in progress** — clean screenshots pending  
- Real-money: **gated** (G-04)

**Explain protections:**

- **No-pay-no-service:** server gate + UX on cancel/success  
- **Zero duplicate target:** idempotency + L-4/L-5 + duplicate warnings; L-13 not executed  
- **Super-System:** detect/classify in CI; apply **blocked** on money

---

## 7. Stakeholder signoff

**Template only — not signed:** [STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md](./evidence/frontend-qa-2026-05-20/STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md)

| Role | Status |
|------|--------|
| Product | **PENDING SIGNOFF** |
| Engineering | **PENDING SIGNOFF** |
| Security | **PENDING SIGNOFF** |
| Payment safety | **PENDING SIGNOFF** |
| QA | **PENDING SIGNOFF** |
| Investor-demo | **PENDING SIGNOFF** |

---

## 8. No-false-claim boundary

| Claim | Allowed now? |
|-------|----------------|
| Production-ready | **No** |
| Real-money ready | **No** |
| Frontend QA PASS | **No** |
| Clean investor home captured | **No** (fail-closed PNG ≠ clean) |
| All investor passes complete | **No** |
| Super-System auto-repair enabled | **No** |
| Zero duplicates impossible | **No** — **target** + staging proof |
| Investor-hard frontend evidence **phase in progress** | **Yes** |

---

## 9. Production observability

**Plan (not proven in prod):** [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PLAN_2026_05_21.md)

Covers: frontend uptime, API health/latency, webhook failures, duplicate anomaly, no-pay-no-service violation signals, fulfillment/refund anomalies, severity levels, rollback, escalation, self-healing **detect/report only**.

---

## 10. Remaining blockers before real-money market readiness

| # | Blocker | Type |
|---|---------|------|
| 1 | Clean investor screenshot pack | Evidence |
| 2 | RTL/a11y smoke filed | Evidence |
| 3 | Stakeholder signoff | Governance |
| 4 | Production APM + alerting live | Ops |
| 5 | L-12 / L-13 gated proofs | Money-path |
| 6 | Credential rotation execute | Security |
| 7 | Neon/Vercel dashboard confirm | Ops |
| 8 | Production deploy cert (G-11) | Ops |
| 9 | Live Stripe certification (G-04) | Money |

---

## 11. Execution checklist (operators)

| # | Action | Owner |
|---|--------|-------|
| 1 | Configure local/staging `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test) — **do not commit** | Engineering |
| 2 | Capture 10 investor-hard PNGs per manifest 2026-05-21 | QA |
| 3 | Complete RTL/a11y smoke review | QA |
| 4 | Run 15-min demo rehearsal | Product/CTO |
| 5 | Fill signoff template when evidence complete | Stakeholders |
| 6 | Implement observability plan in prod (separate approved project) | SRE |

**Forbidden during capture:** live charges, refunds, webhook resend, DB/env mutation, self-healing apply.

---

*Investor-hard QA plan · docs only · main @ `fa88b0b` · not production-ready*
