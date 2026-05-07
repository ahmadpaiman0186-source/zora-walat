# L21 — Multi-provider fallback (Phase 1 airtime)

## Goals

- **Reloadly** remains the **primary** provider when `AIRTIME_PROVIDER=reloadly`.
- **Secondary path** is **mock airtime only** in this repository — used for labs and for **explicit** fallback when Reloadly is unavailable or outbound is blocked. A future commercial “provider B” must be a **new adapter** behind `runDeliveryAdapter`, not logic embedded in webhooks or ledger code.
- **No duplicate fulfillment**: fulfillment stays in `fulfillmentProcessingService` + single attempt correlation (`providerExecutionCorrelation`, Reloadly `customIdentifier`). Fallback **does not** change payment capture or ledger posting rules.

## Policy (implemented)

| Situation | Fallback to mock? |
|-----------|-------------------|
| Reloadly returns **`success`** | No — return success |
| Reloadly returns **`failure`** (terminal provider error, simulated transient, etc.) | **No** — pass through to fulfillment retry/terminal handling |
| Reloadly returns **`pending_verification`** or **`ambiguous`** | **No** — unsafe to chain another provider without proof |
| Reloadly returns **`unavailable`** (missing credentials, auth failure mapped to unavailable, etc.) | **Only if** `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true` |
| Outbound blocked (`shouldBlockPhase1ReloadlyOutbound`) | **Only if** mock fallback flag **or** `ZW_LIVE_SIMULATION_PROOF=true` (local proof) |

Default: **`RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK` is false** — no implicit mock in production (see `productionSafetyGates.js`: production **rejects** enabling this flag with `AIRTIME_PROVIDER=reloadly`).

## Configuration

| Env | Role |
|-----|------|
| `AIRTIME_PROVIDER` | `reloadly` \| `mock` — selects adapter branch |
| `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK` | Explicit opt-in for UNAVAILABLE → mock |
| `PHASE1_FULFILLMENT_OUTBOUND_ENABLED` | When false (non-test), outbound may be blocked; fallback uses same flag/proof as above |
| `ZW_LIVE_SIMULATION_PROOF` | Local drill only — pairs with outbound-off |
| `MOCK_AIRTIME_SIMULATE` | Mock-only deterministic outcomes (`retryable` / `terminal`) — not Reloadly |

## Observability

- **Counter**: `fulfillment_provider_reloadly_mock_fallback_total` (in-process / Redis mirror when configured).
- **Log**: `phase1Ops` event **`provider_mock_fallback`** with `primaryProvider`, `secondaryProvider`, `fallbackReason`, `orderIdSuffix`.

## Operational risks

- **Unknown provider truth**: If Reloadly returns ambiguous/pending, **do not** enable mock fallback — reconcile via inquiry/reports (`providerVerificationService`) before assuming delivery.
- **Duplicate real top-up**: Chaining a **live** second provider without strict idempotency and provider reference discipline can double-send airtime — **no live secondary provider is wired** unless you add one deliberately with its own adapter contract.

## Code map

- Policy helpers: `src/domain/delivery/providerFallbackPolicy.js`
- Routing + fallback: `src/domain/delivery/deliveryAdapter.js`
- Execution boundary + correlation injection: `src/services/deliveryExecutionService.js`
- Correlation IDs: `src/lib/providerExecutionCorrelation.js`

## Tests

- `test/providerFallbackPolicy.test.js` — outcome eligibility and env flags (no HTTP).
