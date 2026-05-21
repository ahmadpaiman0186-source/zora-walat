# RTL / accessibility smoke review — 2026-05-20

**Base commit:** `8b2b7f8`  
**Review type:** Manual smoke (not a formal WCAG audit)  
**Overall status:** **PARTIAL** (§8, 2026-05-21) — EN desktop visual only; RTL and manual a11y **PENDING**

**Status legend:** `PENDING EVIDENCE` · `PASS` · `FAIL` · `CODE REVIEW EVIDENCE` · `BLOCKED` · `NOT APPLICABLE`

---

## 1. RTL layout

| # | Check | Locale / dir | Expected | Status | Evidence | Notes |
|---|-------|--------------|----------|--------|----------|-------|
| 1.1 | FA RTL layout — home | FA / RTL | Mirror alignment; readable Persian | **PENDING EVIDENCE** | Screenshot `03-home-fa-rtl.png` | |
| 1.2 | AR RTL layout — home | AR / RTL | Readable Arabic; no overflow | **PENDING EVIDENCE** | Screenshot `04-home-ar-rtl.png` | |
| 1.3 | FA RTL — success | FA / RTL | `returnSuccess` strings readable | **PENDING EVIDENCE** | `07-success-fa-rtl.png` | |
| 1.4 | AR RTL — success | AR / RTL | Same | **PENDING EVIDENCE** | `08-success-ar-rtl.png` | |
| 1.5 | FA RTL — cancel | FA / RTL | `returnCancel` readable | **PENDING EVIDENCE** | `11-cancel-fa-rtl.png` | |
| 1.6 | AR RTL — cancel | AR / RTL | Same | **PENDING EVIDENCE** | `12-cancel-ar-rtl.png` | |
| 1.7 | TR LTR layout | TR / LTR | Turkish copy; LTR correct | **PENDING EVIDENCE** | `05-home-tr.png`, cancel/success TR | |
| 1.8 | EN LTR layout | EN / LTR | Baseline | **PENDING EVIDENCE** | `01-home-desktop-en.png` | |
| 1.9 | No clipped RTL text | FA/AR | No horizontal clip on hero/notes | **PENDING EVIDENCE** | Visual | |
| 1.10 | Locale switcher after RTL | FA→EN | Layout restores LTR | **PENDING EVIDENCE** | QA log | |

---

## 2. Keyboard and focus

| # | Check | Expected | Status | Evidence | Notes |
|---|-------|----------|--------|----------|-------|
| 2.1 | Keyboard navigation — home | Tab reaches language, nav, primary CTAs | **PENDING EVIDENCE** | QA log | |
| 2.2 | Focus order — home | Logical top-to-bottom | **PENDING EVIDENCE** | QA log | |
| 2.3 | Keyboard — success page | CTAs (home, history, refresh) focusable | **PENDING EVIDENCE** | QA log | |
| 2.4 | Keyboard — cancel page | CTAs focusable; no hidden pay retry | **PENDING EVIDENCE** | QA log | |
| 2.5 | Skip / anchor links | `#how-it-works`, `#support-guidance` reachable | **PENDING EVIDENCE** | QA log | |
| 2.6 | No keyboard trap | Can tab out of form regions | **PENDING EVIDENCE** | QA log | |

---

## 3. Semantics and labels

| # | Check | Expected | Status | Evidence | Notes |
|---|-------|----------|--------|----------|-------|
| 3.1 | Headings hierarchy | Sensible h1/h2 on return layout | **PENDING EVIDENCE** | Visual / axe | |
| 3.2 | Button labels | Action text clear (not icon-only critical actions) | **PENDING EVIDENCE** | Visual | |
| 3.3 | Link labels | Nav links descriptive (How it works, Support guidance) | **CODE REVIEW EVIDENCE** | `messages/*/header.*` | Screenshot still **PENDING** |
| 3.4 | Language control | `lang.ariaLabel` present | **CODE REVIEW EVIDENCE** | `messages/en.ts` `lang.ariaLabel` | Runtime **PENDING** |
| 3.5 | No misleading payment status | Success titles match server phase | **CODE REVIEW EVIDENCE** | `CheckoutSuccessReturnPage.tsx` | Visual **PENDING** |

---

## 4. Visual / mobile

| # | Check | Expected | Status | Evidence | Notes |
|---|-------|----------|--------|----------|-------|
| 4.1 | Mobile layout — home | Usable at ~390px | **PENDING EVIDENCE** | `02-home-mobile-en.png` | |
| 4.2 | Mobile layout — success/cancel | Readable notes and CTAs | **PENDING EVIDENCE** | Optional mobile captures | |
| 4.3 | Color contrast | WCAG AA body text (spot check) | **PENDING EVIDENCE** | Contrast tool report | Formal audit **NOT APPLICABLE** v1 |
| 4.4 | Touch targets (mobile) | Primary CTAs tappable | **PENDING EVIDENCE** | Mobile screenshots | |

---

## 5. Screen reader (optional v1)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.1 | NVDA/VoiceOver — success verifying state | **PENDING EVIDENCE** | Optional |
| 5.2 | Announce confirmed vs verifying | **PENDING EVIDENCE** | Optional |

---

## 6. Review verdict

| Field | Value |
|-------|-------|
| **RTL smoke** | **PENDING EVIDENCE** |
| **A11y smoke** | **PENDING EVIDENCE** |
| **Blocking issues** | None recorded (template) |
| **Reviewer** | __________ |
| **Date** | __________ |

**Do not** claim WCAG certification or full accessibility PASS from this smoke sheet alone.

---

---

## 7. Investor-hard continuation (2026-05-21)

**Baseline:** `fa88b0b` (PR #29) · **Plan:** [ZORA_WALAT_INVESTOR_HARD_FRONTEND_QA_PLAN_2026_05_21.md](../../ZORA_WALAT_INVESTOR_HARD_FRONTEND_QA_PLAN_2026_05_21.md)

| # | Check | Expected | Status | Evidence file / note |
|---|-------|----------|--------|-------------------|
| 7.1 | FA layout review — home + return | RTL correct; no clip | **PENDING EVIDENCE** | `HOME-DESKTOP-FA-RTL.png` pending |
| 7.2 | AR layout review — home + return | RTL correct; no clip | **PENDING EVIDENCE** | `HOME-DESKTOP-AR-RTL.png` pending |
| 7.3 | Keyboard navigation — home/success/cancel | All primary actions reachable | **PENDING EVIDENCE** | QA log |
| 7.4 | Focus visibility | Visible focus ring on Tab | **PENDING EVIDENCE** | QA log |
| 7.5 | Readable contrast | Body text readable (spot check) | **PENDING EVIDENCE** | Contrast tool |
| 7.6 | No text overlap — FA/AR | Hero, notes, CTAs | **PENDING EVIDENCE** | Screenshots |
| 7.7 | Language switcher | en↔fa↔ar↔tr without layout break | **PENDING EVIDENCE** | QA log |
| 7.8 | Payment safety copy visible | Duplicate + no-service on success/cancel | **PENDING EVIDENCE** | Return route PNGs |
| 7.9 | Fail-closed warning behavior | Missing key OR unknown success state | **PARTIAL** | `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` (local key only) |
| 7.10 | Mobile responsiveness | Home + return at ~390px | **PENDING EVIDENCE** | `HOME-MOBILE-EN-CLEAN.png` pending |

**§7 verdict:** **PENDING EVIDENCE** — superseded for baseline by §8 (2026-05-21).

---

## 8. RTL / accessibility smoke review (2026-05-21)

**Baseline:** `main` after PR #31 + PR #32 (`dc86ab3`)
**Investor-hard screenshots:** **6 of 10** captured · **4** pending (updated after RTL home PNGs)
**Separate fail-closed (PR #29):** `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` — not RTL/a11y PASS evidence

**Status legend (§8):** `PENDING EVIDENCE` · `PENDING MANUAL QA` · `PARTIAL VISUAL EVIDENCE` · `PARTIAL CODE/VISUAL EVIDENCE` · `CODE REVIEW EVIDENCE` · `NOT APPLICABLE`

### 8.1 Conservative evidence matrix

| # | Area | Expected | Status | Evidence basis |
|---|------|----------|--------|----------------|
| 8.1 | English desktop — clean home (LTR) | Readable EN home; no missing Stripe key banner | **PARTIAL VISUAL EVIDENCE** | `HOME-DESKTOP-EN-CLEAN.png` (PR #31) — desktop EN only; not mobile |
| 8.2 | How-it-works anchor — trust copy | `#how-it-works` trust/payment-safe bullets visible | **PARTIAL VISUAL EVIDENCE** | `HOW-IT-WORKS-ANCHOR-DESKTOP-EN.png` (PR #32) |
| 8.3 | Support-guidance anchor | In-page support guidance; no fake ticketing | **PARTIAL VISUAL EVIDENCE** | `SUPPORT-ANCHOR-DESKTOP-EN.png` (PR #32) |
| 8.4 | FA RTL visual QA | RTL layout correct on home (desktop) | **PARTIAL VISUAL EVIDENCE** | `HOME-DESKTOP-FA-RTL-CLEAN.png` — home only; return routes **PENDING** |
| 8.5 | AR RTL visual QA | RTL layout correct on home (desktop) | **PARTIAL VISUAL EVIDENCE** | `HOME-DESKTOP-AR-RTL-CLEAN.png` — home only; return routes **PENDING** |
| 8.6 | TR localized visual QA | TR home (desktop LTR) | **PARTIAL VISUAL EVIDENCE** | `HOME-DESKTOP-TR-CLEAN.png` — home only; return routes **PENDING** |
| 8.7 | Keyboard navigation | Tab order home/success/cancel | **PENDING MANUAL QA** | Not proven by screenshots alone |
| 8.8 | Focus visibility | Visible focus indicators | **PENDING MANUAL QA** | Not proven by screenshots alone |
| 8.9 | Screen reader semantics | Titles/labels announce correctly | **PENDING MANUAL QA** | No NVDA/VoiceOver log filed |
| 8.10 | Contrast / readability (spot) | Body text readable on captured home views | **PARTIAL CODE/VISUAL EVIDENCE** | 6 home/anchor PNGs; no contrast tool report |
| 8.11 | Payment safety copy (visual) | Trust/duplicate/no-service messaging where shown | **PARTIAL VISUAL EVIDENCE** | Trust section PNG; success/cancel PNGs **not** captured |
| 8.12 | No-pay-no-service copy | Cancel/success no-service language | **CODE REVIEW EVIDENCE** | `messages/*`, components — **not** live-money proof |
| 8.13 | Fail-closed missing-key (local) | Warning when publishable key absent | **PARTIAL VISUAL EVIDENCE** | `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` (PR #29) — separate from clean home |
| 8.14 | Mobile responsiveness | ~390px layouts | **PENDING EVIDENCE** | No `HOME-MOBILE-EN-CLEAN.png` |
| 8.15 | Language switcher behavior | en↔fa↔ar↔tr without break | **PENDING MANUAL QA** | No switcher exercise log |
| 8.16 | Full accessibility PASS | WCAG / complete a11y signoff | **NOT APPLICABLE** | **Not claimed** |

### 8.2 §8 verdict

| Field | Value |
|-------|-------|
| **RTL smoke** | **PARTIAL VISUAL EVIDENCE** — FA/AR/TR **home** desktop PNGs captured; return-route RTL **PENDING** |
| **A11y smoke** | **PARTIAL** — home/anchor visuals; keyboard/screen-reader **PENDING MANUAL QA**; **not** full a11y PASS |
| **Investor-hard screenshots** | **6 / 10** — pack incomplete |
| **QA PASS** | **Not claimed** |
| **Production-ready** | **Not claimed** |
| **Real-money-ready** | **Not claimed** |
| **Payment-flow proof** | **Not claimed** |

**Reviewer:** __________ **Date:** __________

### 8.3 Localized home screenshots (2026-05-21, this branch)

| Locale | File | RTL visual | Notes |
|--------|------|------------|-------|
| FA | `HOME-DESKTOP-FA-RTL-CLEAN.png` | **Captured** | Home desktop only — **PARTIAL** RTL visual evidence |
| AR | `HOME-DESKTOP-AR-RTL-CLEAN.png` | **Captured** | Home desktop only — **PARTIAL** RTL visual evidence |
| TR | `HOME-DESKTOP-TR-CLEAN.png` | **Captured** | Home desktop LTR — localized visual evidence |

Keyboard, focus, and screen reader checks remain **PENDING MANUAL QA**. Payment-flow proof remains **NOT PROVEN**.

---

*Smoke review · main through PR #33 + RTL home PNGs · conservative · not production-ready*
