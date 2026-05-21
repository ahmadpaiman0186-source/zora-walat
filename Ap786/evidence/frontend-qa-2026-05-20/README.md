# Frontend QA evidence — capture folder (2026-05-20)

**Purpose:** Canonical location for **investor-safe** frontend verification artifacts: screenshots, manual QA logs, RTL/a11y smoke notes, and payment-safety UX review records.

**Base commit (latest):** `main` through PR #34 lineage (investor-hard screenshot pack)
**Investor-hard plan (2026-05-21):** [ZORA_WALAT_INVESTOR_HARD_FRONTEND_QA_PLAN_2026_05_21.md](../../ZORA_WALAT_INVESTOR_HARD_FRONTEND_QA_PLAN_2026_05_21.md)
**Branch for final captures:** `evidence/final-investor-hard-screenshots-2026-05-21`

---

## Dated evidence note (2026-05-21 — final captures)

**Investor-hard screenshot evidence: 10 / 10 captured.**

Final four PNGs (Playwright, local UI @ `http://127.0.0.1:3000`, existing dev server):

| File | Meaning |
|------|---------|
| `HOME-MOBILE-EN-CLEAN.png` | Mobile home EN |
| `SUCCESS-DESKTOP-EN-FAIL-CLOSED.png` | Success return — fail-closed / not PAID-confirmed |
| `CANCEL-DESKTOP-EN.png` | Cancel — no service |
| `ORDERS-DESKTOP-EN-EMPTY-OR-FAIL-CLOSED.png` | Orders/history — empty or safe fail-closed |

Prior captures (PR #31–#33): EN/FA/AR/TR home desktop, how-it-works + support anchors.

**Separate historical evidence:** `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` (PR #29) — missing publishable key only; **not** part of 10/10 clean pack.

**Not claimed:** QA PASS · production-ready · real-money-ready · payment-flow proof.

**Governance (2026-05-21):**

| Pack | Path |
|------|------|
| Stakeholder sign-off | [ZORA_WALAT_STAKEHOLDER_SIGNOFF_PACK_2026_05_21.md](../../ZORA_WALAT_STAKEHOLDER_SIGNOFF_PACK_2026_05_21.md) |
| Investor Final QA | [ZORA_WALAT_INVESTOR_FINAL_QA_PACKET_2026_05_21.md](../../ZORA_WALAT_INVESTOR_FINAL_QA_PACKET_2026_05_21.md) |
| Super-System ops | [ZORA_WALAT_SUPER_SYSTEM_SELF_REPAIR_AND_OPERATIONS_SIGNOFF_2026_05_21.md](../../ZORA_WALAT_SUPER_SYSTEM_SELF_REPAIR_AND_OPERATIONS_SIGNOFF_2026_05_21.md) |

---

## Status

| Item | Status |
|------|--------|
| Evidence pack | **Screenshot pack complete** — **10/10** investor-hard PNGs |
| Screenshots | **10/10 CAPTURED** — [SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md](./SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md) |
| Fail-closed (separate) | `HOME-DESKTOP-EN-LOCAL-FAIL-CLOSED.png` (PR #29) |
| Signoff | **PENDING SIGNOFF** — [STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md](./STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md) |
| Manual QA run | **PENDING EVIDENCE** — see `FRONTEND_QA_RUN_REPORT.md` |
| RTL/a11y smoke | **PARTIAL** — visual PNGs filed; keyboard/screen-reader **PENDING MANUAL QA** |
| Payment-safety UX | **PARTIAL VISUAL** + code review — see `PAYMENT_SAFETY_UX_REVIEW.md` |

---

## Rules (mandatory)

1. **Real evidence only** — Do not fabricate images or mark **SCREENSHOT CAPTURED** without a file in this directory.
2. **No production-ready claim** — Filing evidence here does **not** mean production or live-money readiness.
3. **No live-money claim** — Use **Stripe test mode** / local dev only for captures. No live card charges.
4. **No dangerous operations** — No migrations, DB mutation, payments, refunds, webhooks, deploy, or self-healing apply in evidence tranches.
5. **Sanitization** — Screenshots must show **suffix-only** order references where applicable. No API keys, JWTs, or PII.
6. **Status vocabulary** — `PENDING EVIDENCE`, `PENDING CAPTURE`, `CODE REVIEW EVIDENCE`, `SCREENSHOT CAPTURED`, `BLOCKED`, `NOT APPLICABLE`.

---

## Files in this folder

| File | Role |
|------|------|
| [SCREENSHOT_MANIFEST.md](./SCREENSHOT_MANIFEST.md) | 2026-05-20 scaffold + local fail-closed row |
| [SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md](./SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md) | Investor-hard IDs — **10/10 captured** |
| [FRONTEND_QA_RUN_REPORT.md](./FRONTEND_QA_RUN_REPORT.md) | Manual QA session template |
| [RTL_A11Y_SMOKE_REVIEW.md](./RTL_A11Y_SMOKE_REVIEW.md) | RTL and accessibility smoke checklist |
| [PAYMENT_SAFETY_UX_REVIEW.md](./PAYMENT_SAFETY_UX_REVIEW.md) | Super-System payment-safety UX verification |
| [STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md](./STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md) | Signoff template — **not signed** |

**Parent checklist:** [../../ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md](../../ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md)

---

*Evidence folder · investor-hard screenshots 10/10 · not QA PASS · not production-ready*
