# Finance truth & reconciliation (Phase 1 — MOBILE_TOPUP, USD)

This note describes **what is estimated vs actual**, **what cannot be verified** from providers today, and **how anomalies are flagged** for support and ops.

## Customer charge (canonical)

| Field | Nature |
|--------|--------|
| `PaymentCheckout.amountUsdCents` | **Locked** at checkout creation from the server pricing engine (authoritative). |
| `stripeBalanceTransactionAmountCents` | **Actual** gross from Stripe Balance Transaction (should match `amountUsdCents`; if not, `STRIPE_AMOUNT_MISMATCH`). |

## Stripe fees

| Field | Nature |
|--------|--------|
| `stripeFeeEstimateUsdCents` | **Estimated** at checkout (bps + fixed from env). |
| `stripeFeeActualUsdCents` | **Actual** fee from Balance Transaction (async webhook + API retrieve). |
| Divergence | If \|actual − estimate\| > max(absolute cents, ratio × estimate) → `STRIPE_FEE_DIVERGENCE`. Env: `FINANCIAL_TRUTH_STRIPE_FEE_TOLERANCE_CENTS`, `FINANCIAL_TRUTH_STRIPE_FEE_TOLERANCE_RATIO_BPS`. |

## Provider / fulfillment cost

| Field | Nature |
|--------|--------|
| `providerCostUsdCents` | **Locked** catalog/quote at checkout (pre-fulfillment). |
| `providerCostActualUsdCents` | **Actual** only when the provider response exposes a whitelisted cost field (see `extractProviderCostUsdCentsFromResponse` in `marginIntelligence.js`). |
| `providerCostTruthSource` | `provider_api` \| `locked_estimate` \| `unverified` |

### Reloadly

- Normalized safe summaries include **transactionId**, **operatorTransactionId**, **operatorId/Name**, and **passthrough** of whitelisted cost-hint keys when Reloadly returns them (no PII).
- **Often**, Reloadly top-up responses **do not** include a reliable wholesale USD cost in the fields we whitelist. In that case:
  - `providerCostActualUsdCents` stays **null**
  - `providerCostTruthSource` = **`unverified`** (settlement cost not proven from API)
  - Margin that uses provider cost relies on **locked** `providerCostUsdCents`, not settlement truth.

### Mock provider

- No settlement cost; `providerCostTruthSource` remains **`locked_estimate`**; mock is explicit in `fulfillmentTruthSnapshot`.

## Margins (basis points on revenue)

| Field | Formula (all USD cents) |
|--------|-------------------------|
| `projectedNetMarginBp` | At checkout (engine). |
| `actualNetMarginBp` | **Stripe fee actual** (when captured) + **locked** provider + fx + risk buffers. Does **not** require provider API cost. |
| `refinedActualNetMarginBp` | **Best known**: provider = `providerCostActualUsdCents` **or** locked; Stripe fee = **actual** **or** estimate. Recomputed whenever Stripe fee and/or fulfillment truth is updated. |

**Important:** If `providerCostActualUsdCents` is null, refined margin still uses **locked** provider cost — same as actual unless Stripe/FX/risk differ. **`PROVIDER_COST_UNVERIFIED`** flags Reloadly deliveries without API-extracted cost.

## Fulfillment proof (sanitized)

Stored on `PaymentCheckout` for support:

- `fulfillmentProviderReference`, `fulfillmentProviderKey`
- `fulfillmentTruthSnapshot` (JSON): safe response/request hints, destination operator key, delivery source (`mock_provider` vs `reloadly_topup_api`), sanitized provider fields.

Raw secrets, PANs, and full unredacted provider payloads are **not** stored.

## Anomaly codes (`financialAnomalyCodes` JSON array)

| Code | Meaning |
|------|---------|
| `LOW_MARGIN` | `refinedActualNetMarginBp` < `PHASE1_MIN_MARGIN_PERCENT` (delivered orders). |
| `NEGATIVE_MARGIN` | Refined profit ≤ 0 (delivered). |
| `STRIPE_FEE_DIVERGENCE` | Actual vs estimated Stripe fee beyond tolerance. |
| `STRIPE_AMOUNT_MISMATCH` | Balance transaction gross ≠ locked checkout amount. |
| `PROVIDER_REFERENCE_MISSING` | Delivered but no `fulfillmentProviderReference`. |
| `PROVIDER_COST_UNVERIFIED` | Reloadly delivery, success path, no API-extracted provider cost. |

`financialTruthComputedAt` timestamps the last full recompute.

## Support checklist (single row)

From one `PaymentCheckout` + linked `FulfillmentAttempt`s, support can see:

- What the customer was charged (`amountUsdCents`) and Stripe gross/fee (`stripeBalanceTransactionAmountCents`, `stripeFeeActualUsdCents`).
- Locked vs actual provider cost fields and truth source.
- Estimated vs actual margin columns and **refined** margin.
- Anomaly codes and fulfillment snapshot.

## Remaining limitations

- **Reloadly settlement cost** may remain **unknown** until the API consistently returns cost fields we can safely parse — **never** fabricate `providerCostActualUsdCents`.
- **Cross-currency** is out of scope (USD only).
- Admin UI / ticketing integration is **not** included; use DB queries and structured logs (`financial_truth`, `stripe_fee_reconciliation`).
