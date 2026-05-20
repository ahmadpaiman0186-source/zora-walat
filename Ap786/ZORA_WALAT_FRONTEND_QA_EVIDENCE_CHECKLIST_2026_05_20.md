# Zora-Walat — Frontend QA Evidence Checklist

**Date:** 2026-05-20  
**Version:** v1  
**Main HEAD:** `864e884` (PR #25 merged)  
**Purpose:** Define **required** frontend QA evidence for investor and stakeholder review.  
**Policy:** **NO_FALSE_PASS** — status is **PENDING EVIDENCE** unless a file path or screenshot is already in `Ap786/` or linked evidence store.

**Related:** `ZORA_WALAT_INVESTOR_REQUIRED_PASSES_2026_05_20.md` (passes #7–15, #28–29), `ZORA_WALAT_INVESTOR_SAFE_MARKET_READINESS_PACK_2026_05_20.md` (demo script).

---

## 1. Scope

This checklist covers **customer-facing web** (Next.js) only:

| Route / area | Components / messages |
|--------------|----------------------|
| `/` (home top-up) | `ZoraWalatTopUp.tsx`, `messages/{en,fa,ar,tr}.ts` |
| `/success` | `app/success/page.tsx`, `CheckoutSuccessReturnPage.tsx`, `returnSuccess.*` |
| `/cancel` | `app/cancel/page.tsx`, `CheckoutCancelReturnPage.tsx`, `returnCancel.*` |
| **Locales** | en, fa, ar (RTL), tr |
| **Navigation** | `#how-it-works`, `#support-guidance` anchors |
| **Payment-safe copy** | no-pay-no-service, duplicate-payment guidance, fail-closed unknown state |

**Out of scope for v1:** Flutter mobile UI (separate checklist if needed), backend API mutation tests, Stripe live payments.

**Forbidden during QA capture:** real charges, refunds, webhook resend, credential rotation execute, production deploy.

---

## 2. Manual QA Matrix

**Status legend**

| Status | Meaning |
|--------|---------|
| **PENDING EVIDENCE** | Behavior expected per code; screenshot or signed QA log **not** filed in Ap786 |
| **PASS** | Only when evidence file/screenshot path is recorded in §3 or Ap786 |

Default for all rows below: **PENDING EVIDENCE**.

| Area | Locale | Expected result | Status | Evidence needed |
|------|--------|-----------------|--------|-----------------|
| Home page load | EN | Top-up form, hero, trust ribbon, language switcher visible | **PENDING EVIDENCE** | Screenshot: home desktop EN |
| Home page load | FA | RTL layout; Persian copy; no EN leakage on primary CTAs | **PENDING EVIDENCE** | Screenshot: home FA RTL |
| Home page load | AR | RTL layout; Arabic copy | **PENDING EVIDENCE** | Screenshot: home AR RTL |
| Home page load | TR | Turkish copy; LTR | **PENDING EVIDENCE** | Screenshot: home TR |
| Home mobile layout | EN | Usable form/summary on narrow viewport | **PENDING EVIDENCE** | Screenshot: home mobile EN |
| `/success` — no params | EN | Unknown/verifying titles; no “payment confirmed” without server PAID | **PENDING EVIDENCE** | Screenshot: success no-params EN |
| `/success` — pending server status | EN | Verifying copy; pending status label; duplicate + no-service notes | **PENDING EVIDENCE** | Screenshot: success pending EN (staging test order) |
| `/success` — server PAID | EN | “Payment confirmed on our servers” only when API returns PAID/SUCCEEDED | **PENDING EVIDENCE** | Screenshot: success PAID EN (**test mode order only**; suffix-only ref visible) |
| `/success` | FA | Localized `returnSuccess` strings; RTL readable | **PENDING EVIDENCE** | Screenshot: success FA |
| `/success` | AR | Localized Arabic; RTL | **PENDING EVIDENCE** | Screenshot: success AR |
| `/success` | TR | Localized Turkish | **PENDING EVIDENCE** | Screenshot: success TR |
| `/cancel` | EN | No charge, no service, no auto-retry, abuse note | **PENDING EVIDENCE** | Screenshot: cancel EN |
| `/cancel` | FA | Localized `returnCancel`; RTL | **PENDING EVIDENCE** | Screenshot: cancel FA |
| `/cancel` | AR | Localized Arabic; RTL | **PENDING EVIDENCE** | Screenshot: cancel AR |
| `/cancel` | TR | Localized Turkish | **PENDING EVIDENCE** | Screenshot: cancel TR |
| Header anchor “How it works” | EN | Nav scrolls to `#how-it-works` trust section | **PENDING EVIDENCE** | Screenshot or short screen recording |
| Header anchor “Support guidance” | EN/FA/AR | Nav scrolls to `#support-guidance`; no external fake portal | **PENDING EVIDENCE** | Screenshot: support section |
| Support guidance section | EN | Title + body + link to recent orders; no ticket system implied | **PENDING EVIDENCE** | Screenshot: support card EN |
| How-it-works section | EN | Trust/payment verification bullets present | **PENDING EVIDENCE** | Screenshot: trust section |
| Mobile responsive | EN | `/success` and `/cancel` readable on mobile | **PENDING EVIDENCE** | Screenshots: success/cancel mobile |
| Keyboard navigation smoke | EN | Tab reaches language control, nav links, primary CTAs | **PENDING EVIDENCE** | QA log: focus order notes |
| No fake payment success | All | No “paid” or “delivered” without server PAID on success page | **PENDING EVIDENCE** | Code review attestation + pending screenshot |
| No auto-retry on cancel | EN | No button that re-submits payment from cancel page | **PENDING EVIDENCE** | Screenshot: cancel CTAs (home + history only) |
| No full sensitive ID exposure | All | Order reference shows **suffix only** (`maskPublicRef`) | **PENDING EVIDENCE** | Screenshot showing masked ref |
| Hero stat — audit-safe | EN | “Status-aware top-up” (not “Fast delivery” guarantee) | **PENDING EVIDENCE** | Screenshot: hero EN |
| Refresh status on success | EN | “Check status again” re-fetches; does not open new checkout | **PENDING EVIDENCE** | QA log: network tab shows GET only |

**Code references (implementation exists; does not substitute for QA evidence):**

- `components/topup/CheckoutSuccessReturnPage.tsx` — server fetch, PAID classification  
- `components/topup/CheckoutCancelReturnPage.tsx` — no-service copy  
- `components/topup/checkoutReturnUtils.ts` — `maskPublicRef`, `classifyTopupPaymentStatus`  
- `messages/en.ts`, `fa.ts`, `ar.ts`, `tr.ts` — `returnSuccess`, `returnCancel`, `support`, `hero.statInstant`

---

## 3. Screenshot Capture List

Store under `Ap786/evidence/frontend-qa-2026-05-20/` (create folder when capturing) or external evidence store — **do not commit secrets or full order IDs**.

| # | Filename (suggested) | Description |
|---|----------------------|-------------|
| 1 | `01-home-desktop-en.png` | Home `/` desktop English |
| 2 | `02-home-mobile-en.png` | Home mobile English |
| 3 | `03-home-fa-rtl.png` | Home Persian RTL |
| 4 | `04-home-ar-rtl.png` | Home Arabic RTL |
| 5 | `05-success-no-params-en.png` | `/success` without Stripe params |
| 6 | `06-success-pending-en.png` | `/success` verifying/pending (staging) |
| 7 | `07-success-paid-en.png` | `/success` server PAID (**test mode only**) |
| 8 | `08-success-fa.png` | `/success` Persian |
| 9 | `09-success-ar.png` | `/success` Arabic RTL |
| 10 | `10-cancel-en.png` | `/cancel` English |
| 11 | `11-cancel-fa.png` | `/cancel` Persian RTL |
| 12 | `12-anchor-how-it-works.png` | Scrolled to `#how-it-works` |
| 13 | `13-anchor-support-guidance.png` | Scrolled to `#support-guidance` |
| 14 | `14-ci-green-main.png` | GitHub Actions CI green on `main` @ `864e884` |
| 15 | `15-super-system-guard-green.png` | Super-System Guard green on `main` |
| 16 | `16-pr-merge-log.png` | PR #22–#25 merged (GitHub or `git log`) |

**PR merge evidence (repo):**

| PR | Merge commit | Topic |
|----|--------------|-------|
| #22 | `d5b6c86` | Global audit + executive brief |
| #23 | `32584e3` | Frontend Phase A `/success`, `/cancel` |
| #24 | `54e0615` | Phase B i18n + investor polish |
| #25 | `864e884` | Investor pass matrix + evidence boundary |

---

## 4. Accessibility Smoke Checklist

| Check | Expected | Status | Evidence needed |
|-------|----------|--------|-----------------|
| Page headings hierarchy | Logical `h1`/`h2` on return layout | **PENDING EVIDENCE** | axe or manual notes |
| Buttons and links | Descriptive labels (no “click here” only) | **PENDING EVIDENCE** | Spot-check EN/FA |
| Focus order | Language → nav → primary actions reachable by Tab | **PENDING EVIDENCE** | QA log |
| Color contrast | WCAG AA for body text (hero, notes) | **PENDING EVIDENCE** | Contrast tool report |
| Keyboard navigation | All interactive controls operable without mouse | **PENDING EVIDENCE** | QA log |
| RTL layout | fa/ar: alignment, icons, padding not broken | **PENDING EVIDENCE** | Screenshots §3 #3–4, #8–9, #11 |
| No misleading status | Success page never shows “delivered” without server state | **PENDING EVIDENCE** | Code + screenshot #5–7 |
| Screen reader spot (optional) | Return page titles announce verifying vs confirmed | **PENDING EVIDENCE** | NVDA/VoiceOver notes |

---

## 5. Payment-Safety UX Checklist

| Requirement | Implementation reference | QA status | Evidence needed |
|-------------|-------------------------|-----------|-----------------|
| No client-side wallet credit | No wallet balance mutation in return components | **PENDING EVIDENCE** | Code review + UI walkthrough |
| No client-side service grant | `noServiceNote` / cancel `noService` | **PENDING EVIDENCE** | Screenshots #5–11 |
| No fake success | PAID UI only when `classifyTopupPaymentStatus` → confirmed | **PENDING EVIDENCE** | Screenshot #5 vs #7 |
| No auto-retry payment | Cancel `retryNote`; success refresh is GET only | **PENDING EVIDENCE** | Screenshot #10; network log |
| Fail-closed unknown state | `titleUnknown`, `leadUnknown`, unavailable API copy | **PENDING EVIDENCE** | Screenshot #5 |
| Cancel = no service | `returnCancel.noService` visible | **PENDING EVIDENCE** | Screenshot #10–11 |
| Duplicate-payment warning | `duplicateTitle`, `duplicateBody` on success | **PENDING EVIDENCE** | Screenshot #6–7 |
| Suffix-only reference | `maskPublicRef` in UI | **PENDING EVIDENCE** | Screenshot with `…` prefix ref |
| No raw Stripe secrets in UI | No secret keys in page source | **PENDING EVIDENCE** | View-source spot check |

---

## 6. QA Verdict

| Statement | Verdict |
|-----------|---------|
| **QA evidence pack complete?** | **No — not complete yet.** |
| **This file’s role** | Defines **required** evidence; does not certify PASS by itself. |
| **Frontend engineering status** | **Materially improved** on `main` (PR #23–#24): investor-grade return routes, fa/ar/tr i18n, safe anchors, audit-safe hero. |
| **Investor pass matrix alignment** | Passes #7–11 **PASS** (code/repo); #13, #28–#29 **PARTIAL / NOT PROVEN** until this checklist is executed and filed. |
| **Stakeholder sign-off** | **Pending** — no signed artifact in Ap786. |
| **Recommended next step** | Run §2 matrix on staging/local; capture §3 screenshots; file QA log; update pass matrix rows #28–#29 only when evidence exists. |

**When complete:** Add entry to `AP786_EVIDENCE_INDEX.txt` e.g. `FRONTEND_QA_v1 2026-05-20: evidence/frontend-qa-2026-05-20/ — PASS with dated sign-off`. Until then, all marketing and “full frontend investor-grade PASS” claims remain **not allowed**.

---

*Checklist v1 · docs only · no fake PASS · main @ `864e884`.*
