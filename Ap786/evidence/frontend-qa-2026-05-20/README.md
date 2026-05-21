# Frontend QA evidence — capture folder (2026-05-20)

**Purpose:** Canonical location for **investor-safe** frontend verification artifacts: screenshots, manual QA logs, RTL/a11y smoke notes, and payment-safety UX review records.

**Base commit (latest):** `fa88b0b` — `main` after PR #29 (local fail-closed screenshot)
**Investor-hard plan (2026-05-21):** [ZORA_WALAT_INVESTOR_HARD_FRONTEND_QA_PLAN_2026_05_21.md](../../ZORA_WALAT_INVESTOR_HARD_FRONTEND_QA_PLAN_2026_05_21.md)
**Branch for capture work:** `evidence/remaining-investor-hard-screenshots-2026-05-21` (recommended)

---

## Dated evidence note (2026-05-21)

Investor-hard screenshot evidence **partial** — **3** of **10** captured:

| File | Source |
|------|--------|
| `HOME-DESKTOP-EN-CLEAN.png` | PR #31 — clean home EN desktop (test publishable key; gitignored `.env.local`) |
| `HOW-IT-WORKS-ANCHOR-DESKTOP-EN.png` | This branch — `#how-it-works` trust section |
| `SUPPORT-ANCHOR-DESKTOP-EN.png` | This branch — `#support-guidance` section |

**7** investor-hard IDs remain **PENDING CAPTURE**. RTL/a11y review and signoff **incomplete**. **Not** QA PASS, production-ready, real-money ready, or payment-flow proof.

---

## Status

| Item | Status |
|------|--------|
| Evidence pack | **IN PROGRESS** — templates + partial captures |
| Screenshots | **PARTIAL** — **3**× investor-hard clean; 1× local fail-closed (PR #29); **7** IDs **PENDING** — [SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md](./SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md) |
| Signoff | **PENDING SIGNOFF** — [STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md](./STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md) |
| Manual QA run | **PENDING EVIDENCE** — see `FRONTEND_QA_RUN_REPORT.md` |
| RTL/a11y smoke | **PENDING EVIDENCE** — see `RTL_A11Y_SMOKE_REVIEW.md` |
| Payment-safety UX | **CODE REVIEW EVIDENCE** (partial) + **PENDING EVIDENCE** (visual) — see `PAYMENT_SAFETY_UX_REVIEW.md` |

---

## Rules (mandatory)

1. **Real evidence only** — Add PNG/WebP screenshots or signed QA logs when an operator captures them. Do **not** fabricate images or mark **SCREENSHOT CAPTURED** without a file in this directory (or a documented external path).

2. **No production-ready claim** — Filing evidence here does **not** mean production or live-money readiness.

3. **No live-money claim** — Use **Stripe test mode** / local dev only for any payment-adjacent capture. No live card charges.

4. **No dangerous operations** — Creating this scaffold did **not** run migrations, DB mutation, Neon/Vercel/env changes, Stripe API calls, payments, refunds, webhooks, L-12/L-13, credential rotation, deploy, or self-healing apply.

5. **Sanitization** — Screenshots must show **suffix-only** order references (`…` masked). No API keys, JWTs, full card numbers, `DATABASE_URL`, or customer PII.

6. **Status vocabulary** — Use only: `PENDING EVIDENCE`, `PENDING CAPTURE`, `CODE REVIEW EVIDENCE`, `SCREENSHOT CAPTURED`, `BLOCKED`, `NOT APPLICABLE`.

---

## Files in this folder

| File | Role |
|------|------|
| [SCREENSHOT_MANIFEST.md](./SCREENSHOT_MANIFEST.md) | Required captures + filenames + status |
| [FRONTEND_QA_RUN_REPORT.md](./FRONTEND_QA_RUN_REPORT.md) | Manual QA session template |
| [RTL_A11Y_SMOKE_REVIEW.md](./RTL_A11Y_SMOKE_REVIEW.md) | RTL and accessibility smoke checklist |
| [PAYMENT_SAFETY_UX_REVIEW.md](./PAYMENT_SAFETY_UX_REVIEW.md) | Super-System payment-safety UX verification |
| [SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md](./SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md) | Investor-hard screenshot IDs (2026-05-21) |
| [STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md](./STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md) | Signoff template — **not signed** |

**Parent checklist:** [../../ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md](../../ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md)

---

## How to complete evidence

1. Run local or staging Next.js (`npm run dev` or approved staging URL).  
2. Capture each row in `SCREENSHOT_MANIFEST.md`; save files using the **File Name** column.  
3. Fill `FRONTEND_QA_RUN_REPORT.md` with date, tester, environment, defects.  
4. Complete `RTL_A11Y_SMOKE_REVIEW.md` and `PAYMENT_SAFETY_UX_REVIEW.md`.  
5. Update manifest statuses to **SCREENSHOT CAPTURED** only when files exist.  
6. Update `Ap786/AP786_EVIDENCE_INDEX.txt` when the pack is complete (do not claim PASS early).

---

*Scaffold · docs/evidence only · not production-ready*
