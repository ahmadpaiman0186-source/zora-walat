# Zora-Walat — Investor-Safe Market Readiness Pack

**Date:** 2026-05-20  
**Audience:** Investors, founders, design partners, CTO, GTM leads  
**Main HEAD:** `864e884` — Merge pull request #25 (investor pass matrix and evidence boundary)  
**Related:** `ZORA_WALAT_INVESTOR_REQUIRED_PASSES_2026_05_20.md`, `ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md`  
**Sanitization:** No secrets, env values, keys, PII, or raw payment data.  
**Policy:** Honest framing only — **not production-ready**, **not live-money ready**.

---

## 1. Executive Position

**Zora-Walat is ready for investor-safe technical review** — meaning structured diligence, controlled staging walkthroughs, and a documented evidence pack under `Ap786/`. This is **not** the same as market launch or production go-live.

**Zora-Walat is not production-ready yet.** Production and live-money claims remain **blocked** by gated operations (credential rotation execute, L-12/L-13 proofs, operator Neon/Vercel confirmation, production observability, stakeholder sign-off).

The project has **strong audit, frontend, localization, and Super-System progress**:

| Milestone | Status |
|-----------|--------|
| PR #22 | Global audit docs + executive engineering brief — **merged** |
| PR #23 | Frontend Phase A — investor-grade `/success` and `/cancel` — **merged** |
| PR #24 | Frontend Phase B — return-route fa/ar/tr i18n + investor polish — **merged** |
| PR #25 | Investor required pass matrix + claim boundary — **merged** |
| CI + Super-System Guard | **Green** on `main` after PR #25 (operator attestation) |
| Staging money-path L-1…L-11 | **PASS** (Stripe **test mode** only) |

**Production / live-money claims must not be used** in investor conversations until blockers in `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` are cleared with recorded evidence.

---

## 2. What Can Be Shown to Investors Now

Present **only** sanitized, indexed materials. Recommended order:

| # | Material | Path / reference | What it proves |
|---|----------|------------------|----------------|
| 1 | Executive engineering brief | `ZORA_WALAT_PROJECT_EXECUTIVE_ENGINEERING_BRIEF.md` | Product, architecture, 68% PARTIAL, blockers |
| 2 | Investor pass matrix | `ZORA_WALAT_INVESTOR_REQUIRED_PASSES_2026_05_20.md` | 30 areas — PASS / PARTIAL / BLOCKED / NOT PROVEN |
| 3 | This market readiness pack | This file | Demo script, GTM boundary, diligence Q&A |
| 4 | Frontend QA checklist | `ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md` | Required captures — **PENDING EVIDENCE** |
| 5 | Audit evidence pack | `PROJECT_MEMORY_*`, `GLOBAL_SECURITY_AUDIT_*`, `MONEY_PATH_*`, `GLOBAL_ENGINEERING_HEALTH_*` | Security and money-path posture |
| 6 | Master staging proof | `AP786_ALL_PASSES_INVESTOR_PROOF.md` | L-1…L-11 test-mode journey |
| 7 | Frontend `/success` and `/cancel` | `app/success/page.tsx`, `app/cancel/page.tsx`; `CheckoutSuccessReturnPage.tsx`, `CheckoutCancelReturnPage.tsx` | Fail-closed return UX (live demo on staging/local) |
| 8 | Localized return flows | `messages/fa.ts`, `ar.ts`, `tr.ts` — `returnSuccess`, `returnCancel` | fa/ar/tr payment-safe copy |
| 9 | No-pay-no-service messaging | `returnCancel.noService`; `returnSuccess.noServiceNote` | Service only after server-confirmed payment |
| 10 | Fail-closed money-path posture | `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md`; `checkoutReturnUtils.ts` | Webhook/server PAID authority; UI does not grant service |
| 11 | CI and Super-System Guard | `.github/workflows/ci.yml`, `super-system-guard.yml`; `PR21_POST_MERGE_VERIFICATION.md` | Regression guard; read-only zw-doctor signals |

**Not yet in repo (capture before marketing):** screenshots, RTL/a11y QA report, signed stakeholder approval — see §9 and the QA checklist.

---

## 3. What Must Not Be Claimed

| Unsafe Claim | Why Not Allowed | Safe Alternative |
|--------------|-----------------|------------------|
| **Production-ready** | L-12/L-13 open; rotation execute pending; no prod APM proof; no dashboard final confirm | “**Not production-ready**; ~68% PARTIAL program readiness; staging evidence strong” |
| **Live-money ready** | G-04 gated; all Stripe proofs are **test mode** | “Stripe **test-mode staging** proofs through L-11; live mode requires separate certification” |
| **All Stripe risks eliminated** | L-13 duplicate refund not executed; live dashboard drift possible | “Staging controls and duplicate **target** with L-4/L-5 proof; L-13 **pending**” |
| **Duplicate transactions impossible** | UX warns only; absolute guarantee not proven globally | “**Zero duplicate target**; UX guidance + staging webhook idempotency; L-13 not PASS” |
| **Auto-repair fully enabled** | `SELF_HEALING_APPLY_ALLOWED false` by design | “Super-System **detects and proposes**; apply **disabled** on money/credentials” |
| **All investor passes complete** | Matrix shows NOT PROVEN / BLOCKED / PARTIAL items | “**17 PASS**, **8 PARTIAL**, **4 BLOCKED**, **5 NOT PROVEN** per pass matrix” |
| **Full frontend investor-grade PASS** | No screenshot pack; a11y/RTL QA not filed; sign-off pending | “**Return routes** investor-grade on `main`; **full** frontend sign-off **pending** (72% estimate)” |
| **Instant / guaranteed delivery** | Hero uses status-aware wording; fulfillment is server-gated | “**Status-aware top-up**; delivery after server PAID confirmation” |
| **We never store card data** | True for hosted Checkout scope; scope must not imply PCI audit complete | “Card data handled by **Stripe Checkout**; we do not store full card numbers on our servers (evidenced scope)” |

---

## 4. Investor Demo Script

**Environment:** Staging or local dev with **Stripe test mode** only. Say so at the start.

**Duration:** ~20–30 minutes (technical review, not sales close).

### 4.1 Opening (2 min)

> “Zora-Walat is an international mobile top-up platform. Today we are showing **engineering evidence** and **staging test-mode** behavior. This is **not** a production launch demo and **not** live money.”

Open: `Ap786/README.md` → investor pass matrix → this pack.

### 4.2 Home / top-up page (5 min)

1. Open `/` (Next.js top-up experience).
2. Show **language switcher** — switch **en → fa → ar → tr** (note RTL for fa/ar).
3. Point to **hero**: “Status-aware top-up” (not “instant delivery” guarantee).
4. Scroll **How it works** (`#how-it-works`) — trust / payment verification copy.
5. Scroll **Support guidance** (`#support-guidance`) — in-page guidance only; no fake ticketing.
6. **Do not** complete a live payment unless pre-approved staging harness is ready.

### 4.3 `/success` behavior (5 min)

1. Open `/success` **without** Stripe return params — show **unknown / verifying** copy (fail-closed).
2. If staging order available: open with `order_id` (+ session context) — show **verifying** vs **server confirmed** states.
3. Explain: **PAID title only when server `paymentStatus` confirms** (`classifyTopupPaymentStatus` in `checkoutReturnUtils.ts`).
4. Show **duplicate-payment warning** and **no service from this page alone** footnotes.
5. Show **Check status again** — manual refresh only; **no auto-retry payment**.

### 4.4 `/cancel` behavior (3 min)

1. Open `/cancel`.
2. Read **no charge**, **no service**, **no auto-retry** copy.
3. Explain **no-pay-no-service**: abandonment does not grant airtime/data.

### 4.5 Money-path and Super-System (5 min)

1. Open `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md` — webhook PAID authority, fulfillment gate.
2. Open `AP786_ALL_PASSES_INVESTOR_PROOF.md` — L-1…L-11 staging summary.
3. Mention **Super-System Guard** on GitHub — secrets scan + zw-doctor (no money mutations in CI).

### 4.6 Evidence pack and blockers (5 min)

1. Show pass matrix §6 — **blocked / not proven** items.
2. Show `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` — L-12, L-13, rotation, live-money **gated**.
3. Close: “**Credible technical review path**; **production blocked** until evidence and approvals complete.”

### 4.7 Demo do-nots

- Do not claim production-ready or live Stripe.
- Do not run credential rotation, refunds, or webhook resend during the demo.
- Do not show full order IDs — suffix-only in UI (`maskPublicRef`).

---

## 5. Product Story for Investor

**What Zora-Walat does**  
Zora-Walat enables **international mobile top-up** (airtime, data, calling) for diaspora and travelers. Customers select operator and product, pay via **Stripe-hosted Checkout** in USD, and receive fulfillment after **servers** confirm payment — not when the browser alone shows a success URL.

**Why money-path safety matters**  
Top-up is **prepaid digital goods**. A single mistaken “paid” state can cause **provider spend without revenue** or **double delivery**. The architecture treats **webhooks and server state** as authoritative; client return pages are **read-only status displays**.

**What Super-System means**  
A **Super-System Intelligent Production Platform** baseline: automated detection of misconfiguration and money-path drift (zw-doctor, CI Guard), **fail-closed** defaults, sanitized Ap786 evidence, and **gated** execution for dangerous operations (refunds, rotation, live-money, auto-repair apply). It is **not** unattended self-healing in production today.

**What has been proven (evidence scope)**

- Staging **test-mode** checkout → webhook → fulfillment (L-1…L-11).  
- Duplicate webhook resend safety (L-4/L-5).  
- Unpaid / decline / cancel / expire paths do not fulfill (L-8–L-10).  
- One full refund + incident mirror (L-11).  
- Frontend return routes with fail-closed copy and fa/ar/tr localization (PR #23–#24).  
- CI + Super-System Guard green on `main` (attested post–PR #25).

**What remains gated**

- L-12 partial refund, L-13 duplicate refund proof.  
- Operator credential rotation **execute**.  
- Production live Stripe, Neon/Vercel dashboard confirmation, production APM.  
- Frontend QA screenshots, RTL/a11y report, stakeholder sign-off.

---

## 6. Technical Due Diligence Answer Sheet

| Question | Safe answer |
|----------|-------------|
| **Is this production-ready?** | **No.** Program ~**68% PARTIAL**. Staging money-path is strong; production blockers remain in gated ops and operator confirmation. |
| **Is Stripe live enabled?** | **Not proven in this evidence pack.** Documented proofs use **Stripe test mode** on staging. Live mode is G-04 gated. |
| **Can users receive service without payment?** | **Designed no** — fulfillment gates on server PAID; unpaid paths L-8–L-10 show zero fulfillment. UI states **no service from return pages alone**. Absolute “impossible in all edge cases” is **not claimed**. |
| **Can duplicate transactions happen?** | **Risk is mitigated, not eliminated.** Idempotency + L-4/L-5 staging proof; UX warns against duplicate checkout; L-13 **not executed**. |
| **What happens on cancelled payment?** | User sees `/cancel`: **no charge**, **no service**, **no auto-retry**. Staging L-9: order **PENDING**, no fulfillment. |
| **What if payment status is unknown?** | `/success` shows **verifying / unknown** copy; fetches read-only order list; **does not** grant service. User told not to start another payment unless support advises. |
| **What evidence exists?** | `Ap786/` pack: executive brief, pass matrix, staging L-1…L-11, security/money-path audits, PR #21–#25 merge record, CI Guard workflow. |
| **What remains blocked?** | L-12, L-13, rotation execute, live-money, prod APM, Neon/Vercel confirm, full frontend QA artifacts, stakeholder sign-off. |

---

## 7. Current Readiness Snapshot

Conservative scores from `ZORA_WALAT_INVESTOR_REQUIRED_PASSES_2026_05_20.md` — **do not inflate**:

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Investor review readiness** | **76%** | Docs + matrix + staging proofs; missing screenshots/sign-off |
| **Frontend readiness** | **72%** | Return routes + i18n; QA evidence **pending** |
| **Production readiness** | **32%** | Live money, APM, deploy cert blocked |
| **Money-path global readiness** | **70%** | L-1…L-11 staging strong; L-12/L-13 open |
| **Headline** | **~68% PARTIAL** | Not production-ready |

---

## 8. Go-To-Market Boundary

### Allowed now

| Activity | Framing |
|----------|---------|
| **Investor technical review** | Evidence pack + pass matrix + controlled Q&A |
| **Internal demo** | Engineering/staging; test mode labeled |
| **Controlled technical walkthrough** | Demo script §4; no live-money |
| **Design partner discussion** | **Beta / non-production** — no public “launched” claim |

### Not allowed now

| Activity | Why |
|----------|-----|
| **Public production launch claim** | Not production-ready |
| **Live-money claim** | G-04; no live proof |
| **No-risk money-path claim** | L-12/L-13 and live edge cases open |
| **Unrestricted customer onboarding** | No prod cert, no full QA/sign-off |

---

## 9. Evidence Required Before Public Marketing

Complete **before** any broad public or paid marketing:

| # | Evidence | Owner | Status |
|---|----------|-------|--------|
| 1 | Screenshots per QA checklist | Engineering/QA | **PENDING** |
| 2 | RTL / a11y smoke QA report | QA | **PENDING** |
| 3 | Stakeholder sign-off (copy + money claims) | Product/CTO | **PENDING** |
| 4 | Neon/Vercel operator dashboard confirmation | Ops | **BLOCKED** |
| 5 | L-12 / L-13 governed execution records | Ops (gated) | **NOT PROVEN** |
| 6 | Credential rotation approval + execute evidence | Ops (G-01) | **BLOCKED** |
| 7 | Production observability plan + APM proof | SRE | **NOT PROVEN** |
| 8 | PR #25+ CI/Guard screenshot on `main` @ `864e884` | Engineering | **PENDING** |
| 9 | Updated pass matrix row for “demo readiness” → PASS | Docs | After 1–3 complete |

---

## 10. Final CTO Verdict

Zora-Walat has a **credible investor-safe technical review path**: executive brief, 30-area pass matrix, staging money-path proofs, Super-System Guard, and **materially improved** frontend return flows with localization.

The project is **not production-ready**. Live-money, full marketing, and “all clear” money-path statements remain **blocked**.

**Next move:** Execute `ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md` — capture screenshots, RTL/a11y smoke, stakeholder sign-off — then refresh the pass matrix demo/readiness rows.

**Dangerous operations** (payments, refunds, webhook resend, rotation execute, DB/env change, production deploy, auto-repair apply) remain **gated** per `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`.

---

*Docs-only artifact · main @ `864e884` (PR #25) · no application or infrastructure mutation.*
