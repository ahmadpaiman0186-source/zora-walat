# Frontend QA run report — template

**Report ID:** `FRONTEND-QA-RUN-2026-05-20-001`  
**Status:** **PENDING EVIDENCE** (partial capture — not a completed test run)

---

## 0. Evidence notes (dated)

| Date (UTC) | Note |
|------------|------|
| **2026-05-20** | **One** local fail-closed screenshot filed: `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` — home `/` on **local** dev with **missing Stripe publishable key** warning visible. Documents fail-closed UX when payment setup is incomplete; **does not** complete full frontend QA, **does not** satisfy investor-clean `HOME-DESKTOP-EN`, and **does not** imply QA PASS or production-ready. |
| **2026-05-21** | **One** clean investor screenshot filed: `HOME-DESKTOP-EN-CLEAN.png` — home `/` EN desktop after **test** publishable key configured in gitignored `.env.local`; no missing-key warning. **Partial evidence only** — **no** full QA PASS, **no** payment-flow proof, **no** real-money claim; **9** other investor-hard screenshots still **PENDING CAPTURE**. |
| **2026-05-21** (continued) | **Two** additional investor-hard anchor screenshots filed: `HOW-IT-WORKS-ANCHOR-DESKTOP-EN.png`, `SUPPORT-ANCHOR-DESKTOP-EN.png`. **3** investor-hard screenshots captured total (including `HOME-DESKTOP-EN-CLEAN` from PR #31). Remaining pack **incomplete**. **No** full QA PASS, **no** payment-flow proof, **no** production-ready claim, **no** real-money-ready claim. |
| **2026-05-21** (RTL/a11y) | [RTL_A11Y_SMOKE_REVIEW.md](./RTL_A11Y_SMOKE_REVIEW.md) §8 updated — conservative smoke from **3** EN desktop PNGs (PR #31–#32). Status **PARTIAL** / **PENDING EVIDENCE** / **PENDING MANUAL QA**. Investor-hard screenshots remain **3 of 10**. **No** full QA PASS, **no** payment-flow proof, **no** production-ready, **no** real-money-ready claim. |
| **2026-05-21** (RTL visual) | **Three** localized home screenshots filed: `HOME-DESKTOP-FA-RTL-CLEAN.png`, `HOME-DESKTOP-AR-RTL-CLEAN.png`, `HOME-DESKTOP-TR-CLEAN.png`. Investor-hard visual count **6 of 10**. Remaining pack **incomplete**. **No** full QA PASS, **no** payment-flow proof, **no** production-ready claim, **no** real-money-ready claim. |
| **2026-05-21** (final screenshots) | Final **four** investor-hard screenshots captured via real Playwright-rendered local UI at **http://127.0.0.1:3000** (existing dev server; no env changes): `HOME-MOBILE-EN-CLEAN.png`, `SUCCESS-DESKTOP-EN-FAIL-CLOSED.png`, `CANCEL-DESKTOP-EN.png`, `ORDERS-DESKTOP-EN-EMPTY-OR-FAIL-CLOSED.png`. **10/10** investor-hard screenshots registered. Screenshot evidence only — **not** QA PASS. Production/money-path blockers unchanged. **No** payment mutation, **no** Stripe/payment/refund/webhook operations. |

---

## 1. Session metadata

| Field | Value |
|-------|-------|
| **Environment** | _[ ] Local (`npm run dev`) · [ ] Staging · [ ] Other: _______ |
| **Stripe mode** | _[ ] Test mode only · [ ] No payment performed |
| **Branch** | `evidence/frontend-qa-screenshots-2026-05-20` (recommended) |
| **Base commit** | `8b2b7f8` |
| **Date (UTC)** | __________ |
| **Tester / role** | __________ |
| **Browser(s)** | __________ |
| **API base (`NEXT_PUBLIC_API_URL`)** | Set / unset (do not paste URL with secrets) |

---

## 2. Scope tested

### Routes

| Route | Tested? | Notes |
|-------|---------|-------|
| `/` | [ ] | |
| `/success` | [ ] | Include no-params + optional staging order |
| `/cancel` | [ ] | |

### Locales

| Locale | Tested? | RTL? |
|--------|---------|------|
| EN | [ ] | LTR |
| FA | [ ] | RTL |
| AR | [ ] | RTL |
| TR | [ ] | LTR |

### Viewports / devices

| Viewport | Width | Tested? |
|----------|-------|---------|
| Desktop | ≥1280px | [ ] |
| Mobile | ~390px | [ ] |
| Tablet (optional) | ~768px | [ ] |

---

## 3. Result table

| # | Area | Locale | Expected | Observed | Status | Manifest ID |
|---|------|--------|----------|----------|--------|-------------|
| 1 | Home load | EN | Form + hero + switcher; no missing-key banner | Clean home captured (PR #31) | PARTIAL EVIDENCE | HOME-DESKTOP-EN-CLEAN **CAPTURED** |
| 2 | Home mobile | EN | Usable layout | Mobile home captured (Playwright) | PARTIAL EVIDENCE | HOME-MOBILE-EN-CLEAN **CAPTURED** |
| 3 | Home RTL | FA | RTL correct; clean home | FA home captured | PARTIAL EVIDENCE | HOME-DESKTOP-FA-RTL-CLEAN **CAPTURED** |
| 4 | Home RTL | AR | RTL correct; clean home | AR home captured | PARTIAL EVIDENCE | HOME-DESKTOP-AR-RTL-CLEAN **CAPTURED** |
| 5 | Home | TR | TR copy; clean home | TR home captured | PARTIAL EVIDENCE | HOME-DESKTOP-TR-CLEAN **CAPTURED** |
| 6 | Success fail-closed | EN | No false PAID | Fail-closed success captured | PARTIAL EVIDENCE | SUCCESS-DESKTOP-EN-FAIL-CLOSED **CAPTURED** |
| 7 | Success i18n | FA/AR/TR | Localized | | PENDING EVIDENCE | SUCCESS-* |
| 8 | Cancel no-service | EN | No service copy | Cancel page captured | PARTIAL EVIDENCE | CANCEL-DESKTOP-EN **CAPTURED** |
| 9 | Cancel i18n | FA/AR/TR | Localized | | PENDING EVIDENCE | CANCEL-* |
| 10 | Nav anchors | EN | How-it-works + support guidance in viewport | Both anchor sections captured | PARTIAL EVIDENCE | HOW-IT-WORKS-ANCHOR-DESKTOP-EN, SUPPORT-ANCHOR-DESKTOP-EN **CAPTURED** |
| 12 | Orders / history | EN | Empty or fail-closed | History via Orders nav captured | PARTIAL EVIDENCE | ORDERS-DESKTOP-EN-EMPTY-OR-FAIL-CLOSED **CAPTURED** |
| 11 | CI / Guard | — | Green on main | | PENDING EVIDENCE | CI-GREEN-*, GUARD-GREEN-* |

**Status values:** `PASS`, `FAIL`, `PENDING EVIDENCE`, `BLOCKED`, `NOT APPLICABLE`

---

## 4. Defects found

| Defect ID | Summary | Severity | Route/Locale | Owner | Status |
|-----------|---------|----------|--------------|-------|--------|
| — | _None recorded_ | — | — | — | — |

**Severity:** `P0` money-safety · `P1` functional · `P2` i18n/RTL · `P3` cosmetic

---

## 5. Cross-references

| Document | Completed? |
|----------|------------|
| [SCREENSHOT_MANIFEST.md](./SCREENSHOT_MANIFEST.md) | [ ] All required captures |
| [RTL_A11Y_SMOKE_REVIEW.md](./RTL_A11Y_SMOKE_REVIEW.md) | [x] §8 updated 2026-05-21 — **PARTIAL**, not PASS |
| [PAYMENT_SAFETY_UX_REVIEW.md](./PAYMENT_SAFETY_UX_REVIEW.md) | [ ] |

---

## 6. Next actions

| # | Action | Owner | Due |
|---|--------|-------|-----|
| 1 | Capture pending screenshots per manifest | | |
| 2 | Complete RTL/a11y smoke review | | |
| 3 | Update `AP786_EVIDENCE_INDEX.txt` when pack complete | | |
| 4 | Refresh investor pass matrix rows #28–#29 **only** if evidence supports | | |

---

## 7. Final verdict

| Verdict | Selected |
|---------|----------|
| **PENDING EVIDENCE** | **☑** (default — scaffold only) |
| PASS (investor-safe frontend QA v1) | ☐ |
| FAIL (blocking issues) | ☐ |
| BLOCKED (environment / approval) | ☐ |

**Reviewer sign-off:** __________ **Date:** __________

**Explicit non-claims:** This report does **not** certify production-ready, live-money ready, or full frontend investor-grade PASS until evidence and sign-off are complete.

---

*Template · do not mark PASS without screenshots and completed sections 3–6*
