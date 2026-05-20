# Frontend investor-grade upgrade plan

**Date:** 2026-05-20  
**Repository:** zora_walat  
**Audit branch:** `chore/composer-frontend-investor-plan` (from `main` post–PR #21)  
**Prior work:** `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md` (web top-up + Flutter checkout copy hardening)  
**Sanitization:** No secrets, env values, keys, or PII.

---

## 1. Current frontend status

| Surface | Verdict | Summary |
|---------|---------|---------|
| **Next.js web top-up** (`components/topup/ZoraWalatTopUp.tsx`, `messages/*`) | **PARTIAL — improved** | PR #21-era copy is largely production-safe: Stripe-hosted checkout messaging, trust card, CTA disable reasons, duplicate-submit guards on continue + Payment Element. Staging badge gated by `NEXT_PUBLIC_ZW_APP_ENV`. |
| **Next.js satellite routes** (`app/success`, `app/cancel`, `app/history`) | **GAP — not investor-grade** | Success/cancel pages are hardcoded English with developer diagnostics (session/order IDs, port 3000, “Local Zora-Walat web app”). Not localized. |
| **Flutter mobile** (`lib/features/telecom/presentation/checkout_screen.dart`, `lib/l10n/*`) | **PARTIAL** | Pay CTA guards (`_canPay`, `_busy`) and Stripe redirect copy are strong. Residual **test/integration** strings in wallet and some ARB entries; dev Stripe banner references `pk_test` (dev-only path). |
| **Localization** | **PARTIAL** | `messages/en.ts` is complete; `fa`/`ar`/`tr` are scaffolds (spread `en` for most keys). Flutter has fuller EN but mixed FA/PS wallet copy. |
| **Investor readiness** | **NOT PASS** | Suitable for **staging/demo with honest badges**; not equivalent to production live-money UX certification. |

**Platform readiness (context):** Global ~**68% PARTIAL** per Super-System audit — frontend uplift does not change money-path backend certification.

---

## 2. Critical customer-facing risks

| ID | Risk | Severity | Location |
|----|------|----------|----------|
| F-1 | Success/cancel routes expose dev-oriented copy and raw Stripe params | **HIGH** | `app/success/page.tsx`, `app/cancel/page.tsx` |
| F-2 | Partial locales → English leaks for RTL/TR users on trust/payment/error strings | **MEDIUM** | `messages/fa.ts`, `ar.ts`, `tr.ts` |
| F-3 | Header “How it works” / “Support” are non-functional spans | **MEDIUM** | `ZoraWalatTopUp.tsx` |
| F-4 | `error.network` — “Is the server running?” sounds internal | **LOW–MEDIUM** | `messages/en.ts` |
| F-5 | Order history session-only; weak cross-device story | **MEDIUM** | `OrderHistoryPage.tsx`, `messages/en.ts` history copy |
| F-6 | Flutter `walletTopUpHint` — “testing your integration” | **HIGH** (if wallet visible) | `lib/l10n/app_en.arb` |
| F-7 | Flutter `aboutBody` — “configured carrier integrations” | **MEDIUM** (investor) | `app_en.arb` |
| F-8 | Stat pill “Fast delivery” without qualifier | **LOW** (overpromise) | `messages/en.ts` hero |

---

## 3. Investor-facing risks

| Risk | Notes |
|------|-------|
| Inconsistent product story | Web says “global telecom”; Flutter home still Afghanistan-centric in places |
| Developer leakage on `/success` | Undermines “investor demo” narrative |
| Security wording drift | “Secure” acceptable with Stripe attribution; avoid “bank-grade”, “guaranteed”, “instant” without qualifiers |
| Staging badge | Correct when env=staging; ensure **never** on production build |
| False completeness | Multi-country web catalog vs Flutter phase-1 airtime-only — must align disclaimers |

---

## 4. Payment CTA safety gaps

| Area | Current | Gap |
|------|---------|-----|
| Web continue CTA | Disabled until valid + Stripe + API; `busyIntent` guard | Good — keep regression tests |
| Web Payment Element | `submitting` + `paymentElementReady` gates | Good |
| Flutter pay | `_canPay` + `_busy` | Good |
| Cancel path messaging | Stripe cancel page OK at high level | Not i18n; not linked to order state |
| Double checkout session | `checkoutSession` key + return ref guard | Add E2E test in Phase 2 |
| Unpaid fulfillment UX | Server blocks; web copy mentions verify-before-fulfill | Add explicit **no-pay-no-service** on cancel + pending states |

---

## 5. Copy / messaging fixes (planned)

| Priority | Fix |
|----------|-----|
| P0 | Replace `/success` and `/cancel` with locale-aware, customer-safe panels (no env names, no port hints in production) |
| P0 | Remove/replace Flutter `walletTopUpHint` integration-test wording |
| P1 | Complete `trust`, `error`, `history`, `orderReceipt` keys in `fa`/`ar`/`tr` |
| P1 | Add dedicated `cancelPage` / `successReturn` message keys in `messages/en.ts` |
| P2 | Soften `error.network` to customer-facing “service unavailable” |
| P2 | Qualify hero `statInstant` → “Typically minutes” or similar |
| P2 | Wire real `/how-it-works` and `/support` pages or remove nav placeholders |

---

## 6. UX fixes (planned)

| Item | Action |
|------|--------|
| Success return flow | After Stripe redirect, prefer in-app `OrderSuccessPanel` or branded success route with fulfillment status polling |
| Empty states | History: illustrate “no orders” + CTA to top-up; loading skeletons |
| Loading/errors | Stripe SDK wait state already present; add retry on history load |
| Mobile layout | Review header nav wrap at `<640px` (language + trust chip + staging badge) |
| Accessibility | Ensure `aria-describedby` on all payment CTAs in Flutter parity with web |

---

## 7. Security-claim wording policy

**Allowed (with Stripe attribution):**

- “Stripe-hosted checkout”
- “Payment verified before fulfillment”
- “We do not store your full card number”

**Avoid:**

- “Bank-grade”, “military-grade”, “100% secure”, “guaranteed delivery”
- “Instant” without operator/network qualifier
- Internal terms: mock, test mode (user-visible), DATABASE_URL, `pk_test` in release builds

**Staging:**

- Show **Staging preview** badge only when `NEXT_PUBLIC_ZW_APP_ENV` is `staging` or `preview`.

---

## 8. No-pay-no-service UX requirements

Customer-visible rules (must align with server Phase 1 gates):

1. **Unpaid / cancelled checkout** — explicit: no charge, no fulfillment started.  
2. **Pending payment** — do not show “delivered” or “sent” until paid + fulfillment confirmed.  
3. **Declined / expired** — mirror L-8/L-10 language: order stays unpaid, zero fulfillments.  
4. **Refunded** — distinct from failed; no implication of active service.  
5. **Copy placement** — cancel page, payment summary footnote, trust card, Flutter checkout disabled reasons.

Backend remains authoritative; UI must not contradict PAID-before-fulfill.

---

## 9. Implementation phases

### Phase A — P0 investor blockers (web routes + Flutter wallet copy)

- Locale-aware `app/success` + `app/cancel`  
- Strip dev diagnostics from production builds (`NODE_ENV === 'production'`)  
- Fix `walletTopUpHint` and audit all `test`/`mock` strings in `lib/l10n/app_*.arb`  
- **Tests:** snapshot/copy lint; no live Stripe  

### Phase B — Localization parity

- Fill `messages/fa|ar|tr` for trust, error, history, payment  
- Flutter ARB sync for PS/FA wallet strings  
- RTL visual QA on web header + form  

### Phase C — Navigation & support UX

- Real support/how-it-works pages or footer links  
- Order history: signed-in path copy (future) vs honest session limit  

### Phase D — Hardening & evidence

- Playwright or RTL component tests for CTA disabled states  
- Ap786 `FRONTEND_INVESTOR_GRADE_PASS_EVIDENCE.md` only after operator sign-off — **not** in Phase A  

**Out of scope for frontend-only tranches:** DB, env, payments, refunds, webhooks, deploy.

---

## 10. Tests needed

| Test | Purpose |
|------|---------|
| Web: continue button disabled matrix | Operator/phone/plan/API/Stripe faults |
| Web: PaymentConfirmForm double submit | `submitting` guard |
| Copy grep CI (optional) | Fail on `test mode`, `mock`, `pk_test` in `messages/` and release ARB |
| Flutter: `_canPay` when quote loading/failed | Existing patterns — extend |
| Success/cancel route render | No dev strings in production bundle assert |

---

## 11. Non-claims (mandatory)

This plan does **not** claim:

- Production live-money certification  
- L-13 duplicate refund PASS  
- L-12 partial refund PASS  
- Operator credential rotation complete  
- Full global platform PASS (readiness remains ~68% PARTIAL)  
- That green CI or merged PR #21 equals investor demo readiness for **all** routes  

Frontend Phase A completion yields **improved investor narrative** — not automatic go-live.

---

## 12. Audit method

Read-only inspection of:

- `components/topup/*`, `messages/*`, `app/*`  
- `lib/features/telecom/presentation/checkout_screen.dart`  
- `lib/l10n/app_en.arb` (+ spot-check generated localizations)  
- `lib/env/publicRuntime.ts`  
- Prior `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`

No frontend code modified in this tranche.

---

## 13. Related documents

- `CURSOR_COMPOSER_2_5_DECISION_AND_AGENT_POLICY.md`  
- `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`  
- `PR21_POST_MERGE_VERIFICATION.md`  
- `AP786_ALL_PASSES_INVESTOR_PROOF.md`
