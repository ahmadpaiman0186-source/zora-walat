# Screenshot manifest — frontend QA 2026-05-20

**Base commit:** `8b2b7f8` (`main` post–PR #27)  
**Policy:** **PENDING CAPTURE** until a file exists in this directory (or linked external store with path recorded in **Notes**).  
**Do not** commit secrets, full order IDs, or live-money UI without test-mode labeling.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **PENDING CAPTURE** | Required; file not present |
| **SCREENSHOT CAPTURED** | File exists at **File Name** path |
| **BLOCKED** | Cannot capture without approval (e.g. live-money) |
| **NOT APPLICABLE** | Not required for this release |

---

## Manifest

| Evidence ID | Required Screenshot | Route / Page | Locale | Status | File Name | Notes |
|-------------|---------------------|--------------|--------|--------|-----------|-------|
| HOME-DESKTOP-EN | Home top-up — desktop viewport | `/` | EN | **PENDING CAPTURE** | `01-home-desktop-en.png` | Hero, form, language switcher |
| HOME-MOBILE-EN | Home top-up — mobile viewport | `/` | EN | **PENDING CAPTURE** | `02-home-mobile-en.png` | ~390px width |
| HOME-FA-RTL | Home — Persian RTL | `/` | FA | **PENDING CAPTURE** | `03-home-fa-rtl.png` | Verify RTL alignment |
| HOME-AR-RTL | Home — Arabic RTL | `/` | AR | **PENDING CAPTURE** | `04-home-ar-rtl.png` | Verify RTL alignment |
| HOME-TR | Home — Turkish LTR | `/` | TR | **PENDING CAPTURE** | `05-home-tr.png` | |
| SUCCESS-EN-UNKNOWN-OR-PENDING | Success — no params or pending server status | `/success` | EN | **PENDING CAPTURE** | `06-success-unknown-or-pending-en.png` | Must **not** show “confirmed” without server PAID |
| SUCCESS-FA-RTL | Success return — localized | `/success` | FA | **PENDING CAPTURE** | `07-success-fa-rtl.png` | |
| SUCCESS-AR-RTL | Success return — localized | `/success` | AR | **PENDING CAPTURE** | `08-success-ar-rtl.png` | |
| SUCCESS-TR | Success return — localized | `/success` | TR | **PENDING CAPTURE** | `09-success-tr.png` | |
| CANCEL-EN | Cancel return | `/cancel` | EN | **PENDING CAPTURE** | `10-cancel-en.png` | no service / no auto-retry visible |
| CANCEL-FA-RTL | Cancel return | `/cancel` | FA | **PENDING CAPTURE** | `11-cancel-fa-rtl.png` | |
| CANCEL-AR-RTL | Cancel return | `/cancel` | AR | **PENDING CAPTURE** | `12-cancel-ar-rtl.png` | |
| CANCEL-TR | Cancel return | `/cancel` | TR | **PENDING CAPTURE** | `13-cancel-tr.png` | |
| HEADER-ANCHOR-HOW-IT-WORKS | Nav scroll to trust section | `/` → `#how-it-works` | EN | **PENDING CAPTURE** | `14-anchor-how-it-works.png` | Section id visible in viewport |
| HEADER-ANCHOR-SUPPORT-GUIDANCE | Nav scroll to support guidance | `/` → `#support-guidance` | EN | **PENDING CAPTURE** | `15-anchor-support-guidance.png` | In-page guidance only |
| CI-GREEN-PR27-MAIN | GitHub Actions CI green | N/A (CI) | — | **PENDING CAPTURE** | `16-ci-green-main-8b2b7f8.png` | `main` @ merge PR #27 |
| GUARD-GREEN-PR27-MAIN | Super-System Guard green | N/A (CI) | — | **PENDING CAPTURE** | `17-guard-green-main-8b2b7f8.png` | Workflow: `super-system-guard.yml` |
| PR22-MERGED | PR #22 merged evidence | N/A (GitHub/git) | — | **PENDING CAPTURE** | `18-pr22-merged.png` | Merge `d5b6c86` — global audit pack |
| PR23-MERGED | PR #23 merged evidence | N/A (GitHub/git) | — | **PENDING CAPTURE** | `19-pr23-merged.png` | Merge `32584e3` — Phase A /success /cancel |
| PR24-MERGED | PR #24 merged evidence | N/A (GitHub/git) | — | **PENDING CAPTURE** | `20-pr24-merged.png` | Merge `54e0615` — Phase B i18n |
| PR25-MERGED | PR #25 merged evidence | N/A (GitHub/git) | — | **PENDING CAPTURE** | `21-pr25-merged.png` | Merge `864e884` — investor pass matrix |
| PR26-MERGED | PR #26 merged evidence | N/A (GitHub/git) | — | **PENDING CAPTURE** | `22-pr26-merged.png` | Merge `81c4275` — market readiness + QA checklist |
| PR27-MERGED | PR #27 merged evidence | N/A (GitHub/git) | — | **PENDING CAPTURE** | `23-pr27-merged.png` | Merge `8b2b7f8` — Super-System enforcement pack |

---

## Optional captures (not blocking v1)

| Evidence ID | File Name | Notes |
|-------------|-----------|-------|
| SUCCESS-EN-PAID-TESTMODE | `07b-success-paid-en-testmode.png` | Only with **test-mode** order; masked ref |
| SUCCESS-MOBILE-EN | `07c-success-mobile-en.png` | Mobile return layout |
| CANCEL-MOBILE-EN | `10b-cancel-mobile-en.png` | Mobile cancel layout |

---

## Completion criteria

Manifest is **complete** only when every **required** row is **SCREENSHOT CAPTURED** and `FRONTEND_QA_RUN_REPORT.md` final verdict is updated by a human reviewer — not by scaffold creation alone.
