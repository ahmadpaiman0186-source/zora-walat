# Transaction fortress — proof completion (Phase 1)

**Update (2026-04-07):** Loyalty-on **PASS** after DB migration repair + multi-region **100-order** mock proof are recorded in [`MULTI_REGION_SCALE_PROOF_REPORT.md`](./MULTI_REGION_SCALE_PROOF_REPORT.md) (Sections A–B). Staged **250/500/1000** and real-provider probes are **not** claimed there unless re-run.

**Scope:** Mock-provider concurrency probes + integration checks on the current fortress foundation. **Not** a production load test, **not** live-money / Reloadly proof, **not** a security certification.

**Host / DB:** Local run on **2026-04-07** against the developer `DATABASE_URL` from `server/.env` (same DB used by prior integration tests). Latencies are **wall-clock milliseconds in this environment only**.

**Probe command base:** From `server/`, `npm run fortress:concurrency-probe` with env vars below. Script forces **`mock`** airtime after bootstrap and respects **`FORTRESS_PROBE_LOYALTY_AUTO_GRANT`** (`true` / `false` → `LOYALTY_AUTO_GRANT_ON_DELIVERY`).

---

## SECTION A — 10-order measured result

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=10`, `FORTRESS_PROBE_SAME_ORDER_RACES=0`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=false` (implicit).

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T00:43:10.461Z` |
| `successFulFilledCount` | **10** |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` | **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 10 }`** |
| `invokeErrors` | **0** |
| `wallClockMs` (batch) | **496.59020000000004** |
| `latencyMs.perOrderInvoke.n` | **10** |
| `latencyMs.perOrderInvoke.p50` | **384.9791000000001** |
| `latencyMs.perOrderInvoke.p95` | **493.1324000000001** |
| `latencyMs.perOrderInvoke.p99` | **493.1324000000001** |
| `sameOrderRace.racesWithMoreThanOneProcessingAttempt` | **0** |

---

## SECTION B — 50-order measured result

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=50`, `FORTRESS_PROBE_SAME_ORDER_RACES=0`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=false`.

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T00:26:55.630Z` |
| `successFulFilledCount` | **50** |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` | **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 50 }`** |
| `invokeErrors` | **0** |
| `wallClockMs` | **2179.3201** |
| `latencyMs.perOrderInvoke.n` | **50** |
| `latencyMs.perOrderInvoke.p50` | **1492.8361999999997** |
| `latencyMs.perOrderInvoke.p95` | **2078.2290000000003** |
| `latencyMs.perOrderInvoke.p99` | **2173.0339** |
| `sameOrderRace.racesWithMoreThanOneProcessingAttempt` | **0** |

**Outcome:** Completed successfully (exit code **0**). No failure mode observed.

---

## SECTION C — 100-order measured result

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=100`, `FORTRESS_PROBE_SAME_ORDER_RACES=0`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=false`.

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T00:31:20.934Z` |
| `successFulFilledCount` | **100** |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` | **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 100 }`** |
| `invokeErrors` | **0** |
| `wallClockMs` | **4523.7317** |
| `latencyMs.perOrderInvoke.n` | **100** |
| `latencyMs.perOrderInvoke.p50` | **2916.4695** |
| `latencyMs.perOrderInvoke.p95` | **3968.3785999999996** |
| `latencyMs.perOrderInvoke.p99` | **4506.2224** |
| `sameOrderRace.racesWithMoreThanOneProcessingAttempt` | **0** |

**Outcome:** Completed successfully (exit code **0**). **Not** duplicate attempt leak, **not** teardown failure, **not** lifecycle coherence corruption per `detectPhase1LifecycleIncoherence` on each row. Observed tail latency growth vs 50 orders is consistent with **parallel work + DB contention** on a single local PostgreSQL instance (interpretation, not a separate counter).

---

## SECTION D — Same-order race result

### D.1 — Probe (20 double-invoke races)

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=5`, `FORTRESS_PROBE_SAME_ORDER_RACES=20`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=false`.

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T00:37:40.806Z` |
| `successFulFilledCount` | **25** (5 distinct + 20 race orders) |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` | **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 25 }`** |
| `sameOrderRace.racesRun` | **20** |
| `sameOrderRace.racesWithMoreThanOneProcessingAttempt` | **0** |
| `latencyMs.sameOrderRaceWallMs.p50` | **50.8137999999999** |
| `latencyMs.sameOrderRaceWallMs.p95` | **110.96309999999994** |

**Evidence summary:** For each race, two concurrent `processFulfillmentForOrder` calls ran against the **same** `orderId`; **no** race observed multiple `PROCESSING` attempts at observation time, **no** duplicate `SUCCEEDED` attempts on any order, histogram is **all `FULFILLED`**.

### D.2 — Integration test

**Command:**  
`node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test --test-name-pattern "two concurrent" test/integrations/transactionFortressConcurrency.integration.test.js`

**Result:** **PASS** — `two concurrent processFulfillmentForOrder on same order yield single PROCESSING claim` (~272 ms). Asserts: at most one `PROCESSING`, at most one `QUEUED`, **≤ 1 attempt row** per order after the race.

---

## SECTION E — Loyalty-on controlled result

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=10`, `FORTRESS_PROBE_SAME_ORDER_RACES=0`, `FORTRESS_PROBE_LOYALTY_AUTO_GRANT=true`.

| Metric | Value |
|--------|------:|
| `generatedAt` | `2026-04-07T00:40:14.343Z` |
| `successFulFilledCount` | **0** |
| `failedOrderCount` | **0** |
| `stuckPaidCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `ordersWithLifecycleViolations` | **0** (coherence detector does not treat this stuck pattern as incoherence) |
| `orderStatusHistogram` | **`{ "PROCESSING": 10 }`** |
| `invokeErrors` | **0** |
| Wall / latencies | `wallClockMs` **518.4973999999999**; per-invoke **p50 509.2588999999999**, **p95 516.7476**, **p99 516.7476** |

**Failure mode (explicit):** **`PrismaClientKnownRequestError` `P2021`** — `Invalid prisma.loyaltyLedger.create() invocation: The table public.LoyaltyLedger does not exist in the current database.` during `grantLoyaltyPointsForDeliveredOrderInTx` inside the post-provider success transaction.

**Classification:** **Environment / schema drift** — loyalty auto-grant requires migrated tables; **not** interpreted as a duplicate-send or claim-race bug. Side effect: **`fulfillment_orchestration_failed_after_provider_success`** + **`manual_required_detected`** paths logged.

**Teardown:** Probe **exit code 0**; `finally` cleanup still ran (script design). This documents that **loyalty-on proof did not complete as “10× FULFILLED” on this DB** until migrations match Prisma.

**What a passing loyalty-on probe would require:** `LoyaltyLedger` / grant tables present (e.g. `npm run db:migrate` / `db push` on this database), then rerun the same env.

---

## SECTION F — Mock-safe vs real-provider gap (no live money)

**Mock probe proves today:** Atomic claim, single winner per `QUEUED` attempt, no duplicate `SUCCEEDED` attempts in-sample, coherence checks on persisted rows, **synchronous “provider”** latency (no network).

**What changes with a real provider (e.g. Reloadly web top-up):**

| Area | Mock-safe assumption | Real-provider risk |
|------|----------------------|-------------------|
| **Latency** | Sub-ms to low-ms “send” | HTTP RTT, timeouts, retries; `PROCESSING` dwell time grows; worker pools / DB pool saturation under burst |
| **Mapping** | No numeric operator / country validation | `reloadly_operator_id_invalid` and route-build failures (probe explicitly avoids Reloadly) |
| **Idempotency** | One deterministic success per attempt | Provider may return **pending**, **ambiguous**, or duplicate-safe resend rules may differ; retry policy must align with provider semantics |
| **Proof** | This document | **No** duplicate-send proof against Reloadly from these runs; only mock + unit/integration mocks |
| **Fees / Stripe** | Not in probe | Balance transaction / fee capture still separate async path with its own retry / classification |

**Honest boundary:** High-confidence **Phase 1 money path** for launch still requires **staging** validation with **non-mock** provider, real operator map, and observability on the **fulfillment + fee + incident** paths—not only these mock probes.

---

## SECTION G — Remaining blockers before high-confidence launch

1. **Real-provider end-to-end** — At least one environment where `AIRTIME_PROVIDER` is non-mock, operator mapping is valid, and a bounded set of real or sandbox sends completes without manualrecovery.
2. **Loyalty path on production-shaped DB** — Rerun Section E with migrations applied; confirm grants + ledger + teardown under concurrent delivery.
3. **Operational runbooks** — `PROCESSING` stuck after provider success (already surfaced when DB missing loyalty) must be rare in prod with correct schema; alerts tied to `manual_required` / fulfillment integrity events.
4. **Invalid transition metrics** — Still no first-class “denied transition” counter in metrics export (coherence violations are post hoc).
5. **Scale** — 100 parallel `processFulfillmentForOrder` on one Node process + one DB is a **lab** ceiling signal, not customer RPS.

**Existing design references:** `server/docs/PHASE1_STATE_MACHINE.md`, `PHASE1_IDEMPOTENCY_CONTRACT.md`, `ABUSE_HARDENING_MATRIX.md`, `TRANSACTION_FORTRESS_REPORT.md` (earlier snapshot).

---

## SECTION H — Harsh scorecard (/10) — updated after proof runs

| Criterion | Score | Notes |
|-----------|------:|-------|
| Authoritative lifecycle control | **7** | Unchanged: strong guards, no single dispatcher. |
| Lifecycle idempotency | **7** | Mock probe reinforces DB-level dedupe; no global commercial nonce. |
| Payment-authoritative safety | **8** | Unchanged; not exercised here beyond paid fixture rows. |
| Retry intelligence | **6** | Unchanged. |
| Concurrency safety | **8** | **Up from 7:** measured **50** and **100** mock distinct orders + **20** same-order races + integration test; still not Reloadly. |
| Anti-abuse resistance | **6** | Unchanged (app-layer). |
| Transaction fortress completeness | **7** | **Up slightly:** proof depth improved; **loyalty-on probe failed on schema** — launch readiness for loyalty still conditional. |

**Net:** Mock-path concurrency and coherence evidence are **materially stronger**. Real-provider and loyalty-migrated DB evidence **remain** the honest gaps.
