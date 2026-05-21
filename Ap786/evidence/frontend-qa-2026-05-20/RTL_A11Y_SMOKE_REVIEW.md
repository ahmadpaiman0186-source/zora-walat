# RTL / accessibility smoke review — 2026-05-20

**Base commit:** `8b2b7f8`  
**Review type:** Manual smoke (not a formal WCAG audit)  
**Overall status:** **PENDING EVIDENCE**

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

*Smoke review template · main @ `8b2b7f8` · not production-ready*
