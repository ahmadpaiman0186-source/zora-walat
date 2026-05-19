# Frontend production UX audit — 2026-05-19

**Branch:** `fix/post-l40-slim-stripe-webhook-invalid-signature`  
**Scope:** Customer-facing copy, payment CTA safety, investor-grade trust language  
**Backend:** No payment/refund/webhook logic changed

---

## Executive summary

Upgraded Next.js web top-up and Flutter checkout copy from MVP/test/demo tone to **production-grade, defensible** language. Hardened payment CTAs with disabled reasons, loading states, and duplicate-submit guards.

---

## Findings (classified)

| Finding | Class | Action |
|---------|-------|--------|
| `messages/en.ts` — "Bank-grade security · Test mode" | **SECURITY_CLAIM_RISK** + **CUSTOMER_VISIBLE_BLOCKER** | Replaced with "Secure checkout · Stripe" |
| `messages/en.ts` — "Provider routing is mocked" | **CUSTOMER_VISIBLE_BLOCKER** | Replaced with verified-before-fulfillment wording |
| `messages/en.ts` — success/receipt "test payment" / "not wired" | **INVESTOR_TRUST_RISK** | Production confirmation copy |
| `messages/fa.ts` / `ar.ts` — "(حالت آزمایش)" / "(وضع تجريبي)" | **CUSTOMER_VISIBLE_BLOCKER** | Removed test-mode user copy |
| `lib/l10n` — `confirmMockSnack` label | **PAYMENT_UX_RISK** | Renamed string to "{label} selected" (key unchanged) |
| `server/` test/mock references | **INTERNAL_ONLY_OK** | No change |
| `lib/core/utils/afghan_phone_utils.dart` demo comment | **INTERNAL_ONLY_OK** | Code comment only |
| Flutter `checkout_screen` — pay enabled during quote load | **PAYMENT_UX_RISK** | `_canPay` + disabled reason |
| `buildStripePublishableKeySetupMessage` — hardcoded dev paths / env names in UI | **INVESTOR_TRUST_RISK** | Customer-safe messages in production; dev detail only in `NODE_ENV=development` |
| `error.configApi` — `NEXT_PUBLIC_API_URL` in user string | **INVESTOR_TRUST_RISK** | Support-oriented copy without env var names |

---

## Fixes implemented

### Next.js (`components/topup/ZoraWalatTopUp.tsx`)

- Continue button: disabled until operator, phone, plan, API, Stripe valid
- Visible **disabled reason** or Stripe redirect note under CTA
- Payment summary **Stripe redirect reminder**
- **Trust** card (Stripe-hosted, verify-before-fulfill, incident tracking, no card storage)
- Optional **staging badge** when `NEXT_PUBLIC_ZW_APP_ENV=staging`

### Flutter (`checkout_screen.dart`)

- Pay disabled while pricing loads/fails or Stripe key missing
- Disabled reason shown above pay button
- `_busy` duplicate-submit guard retained

### Locales

- `messages/en.ts` (source), `fa.ts`, `ar.ts`, `tr.ts` aligned

### Error copy (`lib/env/publicRuntime.ts`)

- Production/staging builds: investor-safe Stripe setup message (no paths, no env var names)
- Local development: detailed dev setup hint (masked key preview only when malformed)

---

## Safety confirmations

- No refund commands run
- No secrets in docs or committed files
- No false "bank-grade" / "guaranteed" claims in updated customer copy
