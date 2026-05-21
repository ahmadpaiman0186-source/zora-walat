# Screenshot manifest — investor-hard (2026-05-21)

**Base commit:** `fa88b0b` (`main` post–PR #29)  
**Parent manifest:** [SCREENSHOT_MANIFEST.md](./SCREENSHOT_MANIFEST.md) (2026-05-20 scaffold + local fail-closed row)  
**Policy:** Mark **SCREENSHOT CAPTURED** only when the PNG exists in this folder and meets **investor-clean** rules below.

---

## Investor-clean rules (mandatory)

| Rule | Required |
|------|----------|
| Stripe publishable key | Configured in environment (**test** key OK); UI must **not** show missing-key / payment-setup-incomplete banner |
| Missing-key screenshot | `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` is **separate** — **never** counts as clean home |
| Sanitization | No API keys, JWTs, full order IDs, or PII in image |
| Live money | **Forbidden** — test mode / demo framing only |

---

## Status legend

| Status | Meaning |
|--------|---------|
| **PENDING CAPTURE** | File not present or not yet investor-clean |
| **SCREENSHOT CAPTURED** | Investor-clean PNG in this directory |
| **SCREENSHOT CAPTURED (local fail-closed)** | Fail-closed only — **not** in this table (see parent manifest) |

---

## Investor-hard required captures (2026-05-21)

| Evidence ID | Required Screenshot | Route / Page | Locale | Status | File Name | Notes |
|-------------|---------------------|--------------|--------|--------|-----------|-------|
| HOME-DESKTOP-EN-CLEAN | Home desktop — investor-clean | `/` | EN | **SCREENSHOT CAPTURED** | `HOME-DESKTOP-EN-CLEAN.png` | Local dev with **test** Stripe publishable key configured (`.env.local`, gitignored); no missing-key warning; hero + form + language switcher. **Not** payment-flow proof. |
| HOME-MOBILE-EN-CLEAN | Home mobile — investor-clean | `/` | EN | **SCREENSHOT CAPTURED** | `HOME-MOBILE-EN-CLEAN.png` | ~390×844; Playwright local UI; EN; no missing-key banner; **not** payment-flow proof |
| HOME-DESKTOP-FA-RTL-CLEAN | Home desktop Persian RTL — investor-clean | `/` | FA | **SCREENSHOT CAPTURED** | `HOME-DESKTOP-FA-RTL-CLEAN.png` | RTL home visual; no missing-key banner; **not** payment-flow proof |
| HOME-DESKTOP-AR-RTL-CLEAN | Home desktop Arabic RTL — investor-clean | `/` | AR | **SCREENSHOT CAPTURED** | `HOME-DESKTOP-AR-RTL-CLEAN.png` | RTL home visual; no missing-key banner; **not** payment-flow proof |
| HOME-DESKTOP-TR-CLEAN | Home desktop Turkish — investor-clean | `/` | TR | **SCREENSHOT CAPTURED** | `HOME-DESKTOP-TR-CLEAN.png` | LTR home visual; no missing-key banner; **not** payment-flow proof |
| SUCCESS-DESKTOP-EN-FAIL-CLOSED | Success — verifying/unknown/pending (not PAID-confirmed) | `/success` | EN | **SCREENSHOT CAPTURED** | `SUCCESS-DESKTOP-EN-FAIL-CLOSED.png` | `sessionKey=missing-test-session`; fail-closed / not PAID-confirmed; **no** service-delivered claim; no payment mutation |
| CANCEL-DESKTOP-EN | Cancel — no service | `/cancel` | EN | **SCREENSHOT CAPTURED** | `CANCEL-DESKTOP-EN.png` | no charge, no service, no auto-retry; Playwright local UI |
| ORDERS-DESKTOP-EN-EMPTY-OR-FAIL-CLOSED | Recent orders — empty or safe error | `/history` via Orders nav | EN | **SCREENSHOT CAPTURED** | `ORDERS-DESKTOP-EN-EMPTY-OR-FAIL-CLOSED.png` | Empty or safe fail-closed state — **not** fake paid orders; no data mutation |
| SUPPORT-ANCHOR-DESKTOP-EN | Support guidance section in viewport | `/` → `#support-guidance` | EN | **SCREENSHOT CAPTURED** | `SUPPORT-ANCHOR-DESKTOP-EN.png` | In-page guidance only; investor-hard pack (partial) |
| HOW-IT-WORKS-ANCHOR-DESKTOP-EN | How it works / trust section in viewport | `/` → `#how-it-works` | EN | **SCREENSHOT CAPTURED** | `HOW-IT-WORKS-ANCHOR-DESKTOP-EN.png` | Trust / payment verification copy; investor-hard pack (partial) |

---

## Already filed (do not double-count as clean)

| Evidence ID | File | Status | Use |
|-------------|------|--------|-----|
| HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED | `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` | **SCREENSHOT CAPTURED (local fail-closed)** | Missing publishable key warning only — PR #29 |

---

## Summary

| Category | Count |
|----------|-------|
| Investor-hard IDs **PENDING CAPTURE** | **0** |
| Investor-clean **SCREENSHOT CAPTURED** | **10 / 10** |
| Local fail-closed (separate) | **1** (`HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` — PR #29; historical; not counted in 10/10) |

**Safety (mandatory):** **No QA PASS** claimed · **No** production-ready · **No** real-money-ready · **No** payment mutation · **No** Stripe/payment/refund/webhook operation · Success capture is **fail-closed** (not PAID-confirmed) · Orders capture has **no** fake paid orders.

**Remaining:** Stakeholder sign-off, keyboard/screen-reader manual QA, production/money-path gated blockers unchanged.
