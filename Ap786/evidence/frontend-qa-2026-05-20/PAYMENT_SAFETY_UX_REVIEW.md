# Payment-safety UX review — Super-System alignment

**Date:** 2026-05-20  
**Base commit:** `8b2b7f8`  
**Scope:** Next.js return routes + top-up copy (not backend money-path proofs)  
**Overall:** **PENDING EVIDENCE** (visual/screenshot); partial **CODE REVIEW EVIDENCE**

**Related:** `ZORA_WALAT_SUPER_SYSTEM_GLOBAL_ENFORCEMENT_PACK_2026_05_20.md` §4–5; `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md`

---

## Status legend

| Status | Meaning |
|--------|---------|
| **CODE REVIEW EVIDENCE** | Verified in repo source; **not** a substitute for screenshot/E2E |
| **PENDING EVIDENCE** | Requires screenshot, staging walkthrough, or signed QA |
| **SCREENSHOT CAPTURED** | Visual proof filed in manifest |
| **BLOCKED** | Cannot verify without gated payment op |
| **NOT APPLICABLE** | Out of web UX scope |

---

## Checklist

| # | Control | Required behavior | Code review | Visual / E2E | Status (overall) | Evidence reference |
|---|---------|-------------------|-------------|--------------|------------------|-------------------|
| 1 | No client-side wallet credit | Return/top-up UI must not increment wallet balance | **CODE REVIEW EVIDENCE** — no wallet credit in `CheckoutSuccessReturnPage.tsx` / `CheckoutCancelReturnPage.tsx` | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Flutter hint separate: `walletTopUpHint` in ARB |
| 2 | No client-side service grant | No airtime/data delivery from browser state alone | **CODE REVIEW EVIDENCE** — `returnSuccess.noServiceNote`; server fetch only | **PENDING EVIDENCE** | **PENDING EVIDENCE** | `messages/*/returnSuccess.noServiceNote` |
| 3 | Success claims PAID only when server PAID | Title/lead “confirmed” only if `classifyTopupPaymentStatus` → `confirmed` | **CODE REVIEW EVIDENCE** — `CheckoutSuccessReturnPage.tsx` lines ~84–121; `checkoutReturnUtils.ts` PAID/SUCCEEDED | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Screenshot `06-success-unknown-or-pending-en.png` vs optional PAID test-mode |
| 4 | Unknown/pending fail-closed | Unknown/pending/verifying copy; no delivery promise | **CODE REVIEW EVIDENCE** — default `titleUnknown`, `leadUnknown`, pending labels | **PENDING EVIDENCE** | **PENDING EVIDENCE** | `messages/en.ts` `returnSuccess.*` |
| 5 | Cancel page — no service | Explicit no top-up sent | **CODE REVIEW EVIDENCE** — `returnCancel.noService` rendered in `CheckoutCancelReturnPage.tsx` | **PENDING EVIDENCE** | **PENDING EVIDENCE** | `10-cancel-en.png` etc. |
| 6 | No auto-retry from cancel | No button re-submits Stripe checkout | **CODE REVIEW EVIDENCE** — CTAs home/history; `retryNote` text | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Cancel screenshot |
| 7 | Duplicate-payment guidance | Warn against duplicate checkout | **CODE REVIEW EVIDENCE** — `duplicateTitle`, `duplicateBody` on success layout | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Success screenshot |
| 8 | No full sensitive ID exposure | Suffix-only public ref | **CODE REVIEW EVIDENCE** — `maskPublicRef()` in `checkoutReturnUtils.ts` | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Screenshot showing `…` prefix |
| 9 | Support guidance exists | In-page guidance; no fake ticketing | **CODE REVIEW EVIDENCE** — `support` section; `#support-guidance` in `ZoraWalatTopUp.tsx` | **PENDING EVIDENCE** | **PENDING EVIDENCE** | `15-anchor-support-guidance.png` |
| 10 | Unpaid access not encouraged | Cancel abuse note; no “try pay again” loop on cancel | **CODE REVIEW EVIDENCE** — `returnCancel.abuseNote`, `retryNote` | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Cancel + copy review |
| 11 | No fake success on missing API | Unavailable API → `statusUnavailable` copy | **CODE REVIEW EVIDENCE** — `phase === 'unavailable'` branch | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Optional: API down simulation |
| 12 | Refresh is read-only GET | “Check status again” does not POST payment | **CODE REVIEW EVIDENCE** — `loadStatus` uses GET `topup-orders` | **PENDING EVIDENCE** | **PENDING EVIDENCE** | Network tab in QA log |
| 13 | Hero claim audit-safe | No “instant delivery” guarantee | **CODE REVIEW EVIDENCE** — `hero.statInstant` status-aware (PR #24) | **PENDING EVIDENCE** | **PENDING EVIDENCE** | `01-home-desktop-en.png` |
| 14 | Backend no-pay-no-service (cross-check) | Server gate denies fulfill without PAID | **CODE REVIEW EVIDENCE** (backend) — `phase1FulfillmentPaymentGate.js`; L-8–L-10 Ap786 | **NOT APPLICABLE** (UX doc) | **CODE REVIEW EVIDENCE** | Not a frontend screenshot |

---

## Distinction (required for investors)

| Layer | What this review covers | Status |
|-------|-------------------------|--------|
| **UX copy + client behavior** | This document + screenshots | **PENDING EVIDENCE** (visual) |
| **Authoritative money path** | Webhooks, gates, L-1…L-11 | **PASS (staging)** per Ap786 — separate from screenshots |

Do **not** conflate **CODE REVIEW EVIDENCE** on UI with proof of production money-path at scale.

---

## Verdict

| Field | Value |
|-------|-------|
| Payment-safety UX (code) | **CODE REVIEW EVIDENCE** — implementation aligned with fail-closed doctrine |
| Payment-safety UX (visual) | **PENDING EVIDENCE** |
| Screenshot pack | **PENDING CAPTURE** per [SCREENSHOT_MANIFEST.md](./SCREENSHOT_MANIFEST.md) |
| Production-ready | **No** |
| Live-money ready | **No** |

**Reviewer:** __________ **Date:** __________

---

*UX review scaffold · no Stripe/payment operations performed · main @ `8b2b7f8`*
