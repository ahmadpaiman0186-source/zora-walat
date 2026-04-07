# Phase 1 — Multi-region & staged scale proof (honest readiness)

**Update:** Staged **250** (pass) / **500** (fail at uncapped parallelism) and follow-up race/loyalty reconfirms are in [`ELITE_SCALE_CERTIFICATION_REPORT.md`](./ELITE_SCALE_CERTIFICATION_REPORT.md).

**Scope:** Extends the existing mock-provider concurrency work. **Not** production load certification, **not** live-money Reloadly proof.

**Environment:** Local PostgreSQL from `server/.env` (`DATABASE_URL`). Measurements are **wall-clock milliseconds in this environment only**.

**Commands (from `server/`):**

```text
npm run fortress:concurrency-probe
```

**Probe script:** `server/scripts/transaction-fortress-concurrency-probe.mjs`

**New / useful env:**

| Variable | Purpose |
|----------|---------|
| `FORTRESS_PROBE_MULTI_REGION=true` | Exactly **100** orders: **20×** `senderCountryCode` **US**, **EU**, **CA**, **AE** (Arab-region stand-in per seed), **TR**; `FORTRESS_PROBE_SAME_ORDER_RACES` forced to **0**. |
| `FORTRESS_PROBE_QUIET=true` | Suppresses fulfillment `console.log` JSON lines so **stdout is only the final probe JSON** (optional). |
| `FORTRESS_PROBE_DISTINCT_ORDERS` | Staged runs up to **5000** cap (was 200). |

**Database prerequisite (loyalty-on):** Migrations must actually create `LoyaltyLedger`. On this host, `migrate deploy` had previously recorded `20260402200000_loyalty_ledger_reconciliation_watermark` as applied while **no** `LoyaltyLedger` table existed; `20260405125000_loyalty_ledger_backfill_grants` then failed. **Repair applied before this proof:** delete the broken rows from `_prisma_migrations` for those two names, then `npm run db:migrate` so both migrations apply cleanly. **Do not repeat on production** without following Prisma’s documented recovery process for your situation.

**Captured raw JSON (repo root, this run):**

- `probe-loyalty-on.json` — loyalty-on (noisy stdout; final object is valid).
- `probe-multi-region.json` — five-region burst (same).

---

## SECTION A — Loyalty-on measured result

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=10`, `FORTRESS_PROBE_SAME_ORDER_RACES=0`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=true`, mock provider (script default after bootstrap).

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T01:03:38.174Z` |
| `successFulFilledCount` | **10** |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `stuckProcessingCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` / `invalidTransitionProxyCount` | **0** / **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 10 }`** |
| `invokeErrors` | **0** |
| `loyaltySideEffects.loyaltyPointsGrantRowsForProbeOrders` | **10** |
| `loyaltySideEffects.loyaltyLedgerRowsForProbeUsers` | **10** |
| `wallClockMs` | **541.5437** |
| `latencyMs.perOrderInvoke` | **n=10**, **p50 ~450.8**, **p95 ~536.2**, **p99 ~536.2** |

**Outcome:** **PASS** after `LoyaltyLedger` + backfill migrations applied. No orders left in **PROCESSING**; side-effect tables received one grant + one ledger row per user as counted for probe orders/users.

---

## SECTION B — Five-region 100-order measured result

**Run:** `FORTRESS_PROBE_MULTI_REGION=true`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=false`, `FORTRESS_PROBE_SAME_ORDER_RACES=0` (implicit), mock provider.

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T01:04:08.853Z` |
| Total orders | **100** |
| `successFulFilledCount` | **100** |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `stuckProcessingCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` / `invalidTransitionProxyCount` | **0** / **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 100 }`** |
| `invokeErrors` | **0** |
| `wallClockMs` | **2247.383** |
| Overall `latencyMs.perOrderInvoke` | **n=100**, **p50 ~1294.0**, **p95 ~1603.8**, **p99 ~2247.0** |

### Per-region outcome (histogram: all **FULFILLED**)

| Region label | `senderCountryCode` | Orders | Fulfilled | Failed | Stuck PAID | Stuck PROCESSING | Dup SUCCEEDED | Lifecycle violations | Latency p50 / p95 / p99 (ms) |
|--------------|---------------------|-------:|----------:|-------:|-----------:|---------------:|--------------:|---------------------:|------------------------------|
| US | US | 20 | 20 | 0 | 0 | 0 | 0 | 0 | ~972.7 / ~2247.0 / ~2247.0 |
| EU | EU | 20 | 20 | 0 | 0 | 0 | 0 | 0 | ~1108.8 / ~1249.5 / ~1249.5 |
| CA | CA | 20 | 20 | 0 | 0 | 0 | 0 | 0 | ~1268.0 / ~1418.1 / ~1418.1 |
| ARAB_AE | AE | 20 | 20 | 0 | 0 | 0 | 0 | 0 | ~1429.9 / ~1498.3 / ~1498.3 |
| TR | TR | 20 | 20 | 0 | 0 | 0 | 0 | 0 | ~1563.1 / ~2213.2 / ~2213.2 |

**Interpretation:** Region labels are **probe buckets**; **EU** is the aggregated code from seed data, not a single ISO country. Latency dispersion across regions in this run is dominated by **scheduling / DB contention** under parallel fulfillment, not by business rules per country.

---

## SECTION C — 250 distinct measured result

**Run (intended):** `FORTRESS_PROBE_DISTINCT_ORDERS=250`, `FORTRESS_PROBE_SAME_ORDER_RACES=0`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=false`, mock provider, `FORTRESS_PROBE_MULTI_REGION` unset.

**Result:** **Not executed in this workspace session** (automated execution was not completed after script updates). **No numbers below** — do not treat as pass/fail.

**To measure:** from `server/`:

```powershell
$env:FORTRESS_PROBE_QUIET='true'
$env:FORTRESS_PROBE_DISTINCT_ORDERS='250'
$env:FORTRESS_PROBE_SAME_ORDER_RACES='0'
$env:FORTRESS_PROBE_LOYALTY_AUTO_GRANT='false'
node scripts/transaction-fortress-concurrency-probe.mjs
```

---

## SECTION D — 500 distinct measured result

**Result:** **Not executed** (depends on Section C succeeding; escalation not run).

---

## SECTION E — 1000 distinct measured result

**Result:** **Not executed** (depends on staged escalation; **no claim** of 1000-readiness from this document).

---

## SECTION F — Mock-safe vs real-provider gap

**Mock path proves (this phase):** In-process fulfillment with **synchronous** mock provider, PostgreSQL **claim / finalize** behavior, optional **loyalty ledger + grant** under concurrency, and **explicit multi–`senderCountryCode`** burst behavior. Duplicates / coherence / PROCESSING stuck counts were **zero** in measured runs above.

**What changes when the provider is real (e.g. Reloadly web top-up):**

| Risk area | Mock behavior | Real-provider delta |
|-----------|---------------|---------------------|
| **Mapping** | No operator ID validity | `buildWebTopupReloadlyPayload` + `reloadlyOperatorMap`; build failures map to fulfillment errors (`reloadlyWebTopupProvider.js`). |
| **Timeout** | None effective | `env.airtimeProviderTimeoutMs` + `AbortController` on Reloadly HTTP (`reloadlyClient.js`, `reloadlyTopup` payload). |
| **Duplicate send** | Deterministic single success | Depends on Reloadly idempotency / safe retry behavior vs. our `PROCESSING` / attempt FSM; **not** re-proven here. |
| **Provider reference reliability** | N/A | Transaction / reference IDs from Reloadly responses must be stored and reconciled; ambiguous responses need classified handling. |
| **Retry hazard** | Minimal | Retries after partial success can double-charge if misaligned with provider semantics; must match incident / manual-required paths. |

**Smallest controlled real-provider probe (design only — not run here):**

1. **1** order — sandbox Reloadly, valid operator map, **non-mock** `AIRTIME_PROVIDER`, observability on; verify one terminal fulfillment + fee/margin path as applicable.  
2. **3** orders — parallel or back-to-back, check duplicate SUCCEEDED attempts and ledger/stripe side effects.  
3. **5** orders — short burst; compare latency and stuck **PROCESSING** rate to mock baseline.

**Gate:** Run **only** when `RELOADLY_*` credentials, `reloadlySandbox` (or explicit production approval), operator map, and spend limits are **explicitly** safe. **No live-money** probe is asserted in this document.

---

## SECTION G — Hard blockers before “ultra-reliable high-speed scale”

1. **Staged 250 / 500 / 1000** — Not measured here; **scale is unproven** beyond **100** single-region and **100** five-region mock runs in this pass (plus earlier 10/50/100 reports).  
2. **Real-provider E2E** — Reloadly (or chosen provider) must complete bounded sandbox sends with measured duplicate/stuck/**PROCESSING** dwell; mock parity is insufficient.  
3. **Invalid transitions** — Still no first-class kernel counter; `invalidTransitionProxyCount` is **lifecycle coherence on snapshots**, not every denied transition.  
4. **Operational migration integrity** — Any environment where `_prisma_migrations` says “loyalty applied” but tables are missing will reproduce **PROCESSING** stickiness after provider success; needs migration discipline + alerts.  
5. **Single-node ceiling** — One Node process + one Postgres instance; results do **not** predict multi-instance queue workers or regional DB behavior.

---

## SECTION H — Harsh scorecard (/10)

| Criterion | Score | Notes |
|-----------|------:|-------|
| Duplicate-proofing | **7** | Strong mock evidence; **no** real-provider duplicate-send proof. |
| Concurrency safety | **8** | 100-order multi-region + prior race probes; still lab-scoped. |
| Mixed-region readiness | **7** | Explicit **senderCountryCode** burst **PASS** for 100 orders; not geo-distributed infra. |
| Side-effect robustness | **7** | Loyalty-on **PASS** with ledger+grant counts aligned; other side effects (Stripe, incidents) not in this probe. |
| Scale readiness | **4** | **250/500/1000 not run** in this document — honest low score. |
| Real-provider readiness | **4** | Timeouts/mapping exist in code; **no** measured Reloadly burst here. |
| Overall trustworthiness | **6** | Good **mock + schema-honest** story; **no** inflation on scale or provider truth. |

---

**Net:** Loyalty schema drift is **closed** for the tested DB; **five-region** mock burst is **measured clean**. **Progressive scale (250+) and Reloadly truth remain the main honest gaps.**
