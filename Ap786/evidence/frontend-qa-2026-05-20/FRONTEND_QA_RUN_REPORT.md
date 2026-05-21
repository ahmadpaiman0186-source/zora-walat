# Frontend QA run report — template

**Report ID:** `FRONTEND-QA-RUN-2026-05-20-001`  
**Status:** **PENDING EVIDENCE** (template only — not a completed test run)

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
| 1 | Home load | EN | Form + hero + switcher | | PENDING EVIDENCE | HOME-DESKTOP-EN |
| 2 | Home mobile | EN | Usable layout | | PENDING EVIDENCE | HOME-MOBILE-EN |
| 3 | Home RTL | FA | RTL correct | | PENDING EVIDENCE | HOME-FA-RTL |
| 4 | Home RTL | AR | RTL correct | | PENDING EVIDENCE | HOME-AR-RTL |
| 5 | Home | TR | TR copy | | PENDING EVIDENCE | HOME-TR |
| 6 | Success fail-closed | EN | No false PAID | | PENDING EVIDENCE | SUCCESS-EN-UNKNOWN-OR-PENDING |
| 7 | Success i18n | FA/AR/TR | Localized | | PENDING EVIDENCE | SUCCESS-* |
| 8 | Cancel no-service | EN | No service copy | | PENDING EVIDENCE | CANCEL-EN |
| 9 | Cancel i18n | FA/AR/TR | Localized | | PENDING EVIDENCE | CANCEL-* |
| 10 | Nav anchors | EN | Scroll targets | | PENDING EVIDENCE | HEADER-ANCHOR-* |
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
| [RTL_A11Y_SMOKE_REVIEW.md](./RTL_A11Y_SMOKE_REVIEW.md) | [ ] |
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
