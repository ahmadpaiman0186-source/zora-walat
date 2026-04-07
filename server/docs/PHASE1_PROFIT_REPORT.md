# Phase 1 — Profit-protected Afghanistan mobile top-up (management)

## Scope (locked)

- **Active product:** `MOBILE_TOPUP` / `mobile_topup` only (`productType` on `PaymentCheckout`).
- **Receiver market:** Afghanistan (existing fulfillment path).
- **Payer regions:** `US`, `CA`, `EU`, `AE`, `TR` — configurable `SenderCountry` rows (`riskBufferPercent` on **provider cost**, not hardcoded pricing rules per country).
- **Checkout currency:** **USD only** — Stripe `line_items` use `currency: usd`; server rejects non–profit-safe pricing before session creation.
- **Data / calling:** Catalog resolver returns `null` for data package IDs; fulfillment gates on `productType === mobile_topup`. Telecom hub UI shows **airtime only**.

## Recommended minimum order

| Setting | Value | Source |
|--------|-------|--------|
| Enforced minimum | **$10.00 USD** | `PHASE1_MIN_CHECKOUT_USD_CENTS` (default `1000`) |
| Preferred floor | **$15.00 USD** | `PHASE1_RECOMMENDED_MIN_CHECKOUT_USD_CENTS` (advisory / ops) |
| Sub-minimum orders | **Off** | `PHASE1_ALLOW_BELOW_MINIMUM_ORDERS` default `false` |

Airtime **SKU face values** and **amount-only presets** were aligned to **≥ $10** so the app does not show sub-minimum retail that would be **re-priced** to $10 at checkout.

## Where loss is prevented

1. **No client-priced checkouts** — `amountUsdCents` is ignored when `packageId` is present; otherwise it must be in `ALLOWED_CHECKOUT_USD_CENTS` and is re-priced through `computeCheckoutPrice`.
2. **Profit floor** — if projected net margin (after Stripe + landed COGS) would be **below 3%**, checkout fails with `MARGIN_BELOW_FLOOR` and message:  
   `Checkout rejected: projected margin below minimum threshold`
3. **Minimum order** — if the engine cannot charge at least the configured USD minimum (unless emergency flag), checkout fails with `CHECKOUT_BELOW_MINIMUM`.
4. **Stripe session amount** — webhook already fails `PENDING` orders on `amount_total` ≠ `PaymentCheckout.amountUsdCents`.
5. **Fulfillment** — skips non–`mobile_topup` and non-USD rows; idempotency remains via `FulfillmentAttempt` + webhook dedupe.

## Example projected margins (amount-only path, default env)

Assumptions: `PRICING_STRIPE_FEE_BPS=290`, `PRICING_STRIPE_FIXED_CENTS=30`, `PRICING_AMOUNT_ONLY_PROVIDER_BPS=9000`, US risk buffer **0.85%** of provider cost.

| Face amount (preset) | Approx. final charge (USD) | Approx. net margin (bp) |
|---------------------|----------------------------|-------------------------|
| $10 | ~10.13 | ~454 (~4.5%) |
| $15 | ~15.03 | ~452 |
| $20 | ~19.93 | ~451 |
| $25 | ~24.83 | ~451 |

(Run `node` with `computeCheckoutPrice` and your env for exact cents.)

## Files changed (summary)

| Area | Files |
|------|--------|
| Schema + migration | `server/prisma/schema.prisma`, `server/prisma/migrations/20260410140000_phase1_profit_pricing/migration.sql` |
| Pricing engine | `server/src/domain/pricing/pricingEngine.js`, `resolveCheckoutPricing.js`, `catalogResolver.js`, `productTypes.js` |
| Catalog / allowlist | `server/src/lib/pricing.js`, `server/src/lib/allowedCheckout.js` |
| Config | `server/src/config/env.js`, `server/.env.example` |
| Checkout API | `server/src/validators/checkoutSession.js`, `server/src/controllers/paymentController.js`, `server/src/services/paymentCheckoutService.js`, `server/src/lib/checkoutFingerprint.js` |
| Sender regions API | `server/src/controllers/catalogController.js`, `server/src/routes/catalog.routes.js` |
| Fulfillment guard | `server/src/services/fulfillmentProcessingService.js` |
| Flutter | `lib/services/payment_service.dart`, `lib/core/business/sender_country.dart`, `lib/features/telecom/presentation/checkout_screen.dart`, `lib/features/telecom/presentation/telecom_hub_screen.dart`, `lib/features/recharge/presentation/recharge_review_screen.dart`, `lib/features/recharge/presentation/recharge_screen.dart`, `lib/features/telecom/data/telecom_catalog_local.dart` |

## Confirmation

- **USD-only Phase 1:** Yes — checkout session and DB `currency` are USD; multi-currency pricing is not implemented.
- **Profit-safe by design:** Yes — **no** `PaymentIntent` / Checkout session is created until `computeCheckoutPrice` succeeds; margin floor and minimum order are enforced server-side.
