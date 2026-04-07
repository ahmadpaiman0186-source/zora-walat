# Elite scale certification — Phase 1 transaction core (honest)

**Environment:** Single Node process, local PostgreSQL (`DATABASE_URL` from `server/.env`), **mock** airtime provider. Timings are **this machine only**; not RPS, not multi-instance.

**Authoritative probe outputs (parseable JSON):**

| Artifact | Description |
|----------|-------------|
| `server/docs/elite-scale-250.json` | 250 distinct, loyalty off, `sameOrderRaces=0` |
| `server/docs/elite-scale-500.json` | 500 distinct — **failed** (see Section E) |
| `server/docs/elite-same-order-race.json` | 5 distinct + **50** same-order double-invoke races |
| `server/docs/elite-loyalty-recheck.json` | 10 distinct, loyalty on |

**Probe fixes applied during this certification:**

- `FORTRESS_PROBE_QUIET=true` now silences `console.warn` (margin intel used `console.warn` for low-margin routes) and uses `dotenv` `quiet` when set, so **stdout is a single JSON object**.
- Final report line uses `process.stdout.write` (not `console.log`) so it is not swallowed by quiet mode.
- `sameOrderRaces` cap raised from **20 → 100** for deep race runs.
- New fields: `coherenceViolationCount`, `ordersWithMoreThanOneAttemptRow`, `sameOrderRace.raceOrdersWithMoreThanOneAttemptRow`, `raceOrdersWithDuplicateSucceededAttempts`, `raceOrderFinalOrderStatusHistogram`.

**Note on “wall clock”:** The JSON field `wallClockMs` is the **fulfillment pool batch** only (create fixture + `processFulfillmentForOrder` for distinct orders). **Total Node process time** can be much larger because `finally` deletes orders, attempts, loyalty rows, and users **sequentially** (e.g. hundreds of ms per row × N). For operational interpretation of fulfillment contention, prefer **`wallClockMs` + latency percentiles** inside the JSON.

---

## SECTION A — Repaired baseline recap

- **`LoyaltyLedger` / migration history:** Prior repair removed phantom `_prisma_migrations` rows and reapplied `20260402200000_loyalty_ledger_reconciliation_watermark` and `20260405125000_loyalty_ledger_backfill_grants` so ledger tables exist. See [`MULTI_REGION_SCALE_PROOF_REPORT.md`](./MULTI_REGION_SCALE_PROOF_REPORT.md).
- **Earlier proofs (unchanged):** Mock **10 / 50 / 100** distinct, same-order races, multi-region **100** (20× US/EU/CA/AE/TR) — all **PASS** on correctness counters in that report / repo snapshots.

---

## SECTION B — Loyalty-on proof recap

From prior measured run (see multi-region doc / `probe-loyalty-on.json` history): **10/10** `FULFILLED`, **0** duplicates / stuck / violations, **10** grants + **10** ledger rows aligned with probe users.

---

## SECTION C — Multi-region 100 proof recap

**100/100** `FULFILLED`, per-region buckets **20** each for **US, EU, CA, AE (`senderCountryCode`), TR**, **0** duplicates / stuck / violations. Source: [`MULTI_REGION_SCALE_PROOF_REPORT.md`](./MULTI_REGION_SCALE_PROOF_REPORT.md) §B + `probe-multi-region.json` (if retained at repo root).

---

## SECTION D — 250 measured result

**Source:** `server/docs/elite-scale-250.json` — `generatedAt` **2026-04-07T01:28:05.841Z**.

| Metric | Value |
|--------|------:|
| `successFulFilledCount` | **250** |
| `failedOrderCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `stuckPaidCount` | **0** |
| `stuckProcessingCount` | **0** |
| `coherenceViolationCount` / `ordersWithLifecycleViolations` | **0** / **0** |
| `ordersWithMoreThanOneAttemptRow` | **0** |
| `orderStatusHistogram` | **`{ "FULFILLED": 250 }`** |
| `invokeErrors` | **0** |
| `wallClockMs` (batch) | **~5114.1** |
| `latencyMs.perOrderInvoke` | **n=250**, **p50 ~2818.9**, **p95 ~3556.3**, **p99 ~5004.6** |

**First bottleneck observed (interpretation):** **Latency tail** — p99 ~5s vs p50 ~2.8s on mock provider — consistent with **DB contention** under **250-way** parallel work on one Postgres instance, not a correctness regression.

**Operational rating:** **Clean** for correctness counters; **clean but slowing** on tail latency vs smaller N.

---

## SECTION E — 500 measured result

**Source:** `server/docs/elite-scale-500.json` — `generatedAt` **2026-04-07T01:35:03.467Z**.

| Metric | Value |
|--------|------:|
| `successFulFilledCount` | **273** |
| `failedOrderCount` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `stuckPaidCount` | **96** |
| `stuckProcessingCount` | **131** |
| `coherenceViolationCount` | **0** |
| `ordersWithMoreThanOneAttemptRow` | **0** |
| `invokeErrors` | **96** |
| `orderStatusHistogram` | **FULFILLED 273, PROCESSING 131, PAID 96** |
| `wallClockMs` (batch) | **~6229.0** |
| `latencyMs.perOrderInvoke` | **n=500**, **p50 ~3933.2**, **p95 ~6051.1**, **p99 ~6113.0** |

**Escalation:** **STOP** — **500 is not clean**. **1000 was not run.**

**Root-cause classification (evidence-based):** **Resource / connection saturation**, not duplicate-safety or lifecycle coherence drift:

- **`duplicateSucceededAttemptOrders`** and **`coherenceViolationCount`** remain **0**.
- **`invokeErrors` == `stuckPaidCount` (96)** implies many workers **threw before completing** a clean terminal state; **131 stuck `PROCESSING`** fits **transactions / pool contention** under default **`parallelism = 500`** (single Prisma client, bounded pool, Postgres `max_connections`). Exact exception text was **not** captured by the probe (caught in `catch`); next engineering step would be logging `invokeErrors` with error code/message samples.

**Operational rating:** **Not safe to escalate** to 1000 at this parallelism without **pool sizing**, **`FORTRESS_PROBE_PARALLELISM` cap**, or **worker pool** design.

---

## SECTION F — 1000 measured result

**Not executed.** Blocker: **Section E** failure.

---

## SECTION G — Same-order race reconfirmation

**Source:** `server/docs/elite-same-order-race.json` — `generatedAt` **2026-04-07T01:52:06.149Z**.

**Run:** `FORTRESS_PROBE_DISTINCT_ORDERS=5`, `FORTRESS_PROBE_SAME_ORDER_RACES=50`, loyalty **off**, mock.

| Metric | Value |
|--------|------:|
| Distinct + race orders (total) | **55** (`FULFILLED` **55**) |
| `sameOrderRace.racesRun` | **50** |
| `racesWithMoreThanOneProcessingAttempt` | **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `raceOrdersWithMoreThanOneAttemptRow` | **0** |
| `raceOrdersWithDuplicateSucceededAttempts` | **0** |
| `raceOrderFinalOrderStatusHistogram` | **`{ "FULFILLED": 50 }`** (race subset) |
| `coherenceViolationCount` | **0** |

**Conclusion:** High race count **did not** reproduce duplicate processing winners, duplicate SUCCEEDED attempts, or multi-attempt-row anomalies. **Scale stress on the 500 distinct path is orthogonal** to same-order fortress behavior (different failure mode).

---

## SECTION H — Loyalty-on reconfirmation

**Source:** `server/docs/elite-loyalty-recheck.json` — `generatedAt` **2026-04-07T01:52:04.291Z**.

| Metric | Value |
|--------|------:|
| `successFulFilledCount` | **10** |
| `failedOrderCount` | **0** |
| `stuckPaid` + `stuckProcessing` | **0** + **0** |
| `duplicateSucceededAttemptOrders` | **0** |
| `coherenceViolationCount` | **0** |
| `loyaltySideEffects` grants / ledger | **10** / **10** |
| `invokeErrors` | **0** |

**Conclusion:** Side-effect integrity **held** after probe/script changes; no schema gap regression observed.

---

## SECTION I — Operational ceiling observed so far

| Level | Parallelism | Correctness summary | Verdict |
|-------|-------------|---------------------|---------|
| ≤250 | 250 | All mock fulfillments terminal **`FULFILLED`**, no dup / coherence flags | **Highest N proven clean under full parallel fan-out** on this stack |
| 500 | 500 | Incomplete outcomes; **0** duplicate-SUCCEEDED / coherence flags | **Uncapped parallelism exceeded practical DB/client capacity** — **not** a proof of logic bug, **is** a proof of **unsafe configuration** for this lab setup |
| 1000 | — | Not measured | Unknown |

**p50 / p95 / p99 (250):** Typical invoke completes in a few seconds; worst invokes ~5s — useful for **timeout** and **user experience** thinking, not competitor comparison.

**Bottleneck type:** For **500**, primarily **resource ceiling** (connections / contention), **not** lifecycle correctness drift.

---

## SECTION J — Mock vs real-provider gap

(Same honest framing as prior reports.)

- **Mock:** Deterministic provider, no HTTP, no operator mapping failures.
- **Real (e.g. Reloadly):** `airtimeProviderTimeoutMs`, OAuth, payload/operator map failures, ambiguous/pending responses, retry policy vs idempotency, and reconciliation of provider reference IDs — **none** re-certified by the staged mock numbers above.

---

## SECTION K — Hard blockers before “ultra-reliable high-scale” claims

1. **500+ distinct** — Must either **raise DB + Prisma pool limits** and validate, or **cap concurrent fulfillment workers** and define “1000 orders” as **queued throughput** rather than **1000 simultaneous Prisma transactions** on one client.
2. **Capture `invokeErrors` details** — Current probe increments count only; production certification needs **error code histogram** (pool timeout vs unique constraint vs other).
3. **Real-provider stages R1–R3** — Plan below; **no live-money** execution recorded here.
4. **Multi-instance / queue** — All proofs are **single Node**; horizontal scale **unproven**.

---

## SECTION L — Harsh scorecard (/10)

| Criterion | Score | Notes |
|-----------|------:|-------|
| Duplicate-proofing | **8** | Strong mock + 50-race reconfirm; no real-provider. |
| Lifecycle coherence | **8** | No violations even at failed 500 run (stuck states ≠ detector flags). |
| Loyalty side-effect integrity | **8** | 10/10 + counts aligned post-scale-script changes. |
| Multi-region readiness | **7** | Prior **100** mock burst; not geo infra. |
| 250 readiness | **8** | Measured **clean** at **parallelism 250**. |
| 500 readiness | **3** | **Failed** at **parallelism 500** on this env — capacity, not dup regression. |
| 1000 readiness | **1** | **Not run**; blocked. |
| Real-provider readiness | **4** | Plan only here. |
| Overall trustworthiness | **7** | **Does not hide** 500 failure; ceiling stated clearly. |

---

## Real-provider controlled execution plan (Part 7 — not executed)

**Global gates:** Sandbox **or** explicit low caps; valid **operator map**; observability on fulfillment + payments; **rollback**: support can mark orders manual / refund per runbook; **no** batch without R1 pass.

### Stage R1 — 1 real order

| Item | Definition |
|------|------------|
| **Preconditions** | Non-mock `AIRTIME_PROVIDER`; Reloadly OAuth OK; **one** mapped operator; amount at minimum safe test value; Stripe/test payment path if required before fulfillment. |
| **Rollback / support** | Order stuck `PROCESSING` runbook; incident log; wallet / refund policy for test spend. |
| **Anomaly watch** | `PROCESSING` > **2×** `airtimeProviderTimeoutMs`; duplicate provider sends; margin/fees inconsistent with snapshot. |
| **Stop conditions** | Any uncaught exception; unknown provider status; duplicate SUCCEEDED attempts on same order. |
| **Inspect after** | `PaymentCheckout.orderStatus`; single **SUCCEEDED** attempt; provider reference / transaction id fields; `LoyaltyLedger`/`LoyaltyPointsGrant` if loyalty on; Stripe PI status. |

### Stage R2 — 3 real orders

| Item | Definition |
|------|------------|
| **Preconditions** | R1 **clean**; same environment; **three** distinct order ids. |
| **Concurrency** | Prefer **sequential** first run; optional **parallel** second run if pool limits known. |
| **Stop conditions** | Any duplicate SUCCEEDED; coherence violations; 2+ orders stuck `PROCESSING` past timeout threshold. |
| **Inspect after** | Per-order: attempt rows, final status, ledger idempotency (`paymentCheckoutId` unique on grant). |

### Stage R3 — 5 real orders

| Item | Definition |
|------|------------|
| **Preconditions** | R2 **clean**; optional **parallel** submit (≤ worker cap). |
| **Stop conditions** | Invoke error rate > **0** without classification; any payer double-charge signal. |
| **Inspect after** | Aggregate: fulfillment latency p50/p95; stuck counts; reconciliation file if used. |

---

## Final verdict

1. **Highest concurrency level actually proven clean (this stack, mock, full fan-out):** **250** simultaneous `processFulfillmentForOrder` calls with **250/250** terminal **`FULFILLED`** and **zero** duplicate / coherence flags (`elite-scale-250.json`).
2. **First unproven or failed level:** **500** distinct with **parallelism = 500** — **227/500** did not reach **`FULFILLED`** (`elite-scale-500.json`); escalation to **1000** **stopped**.
3. **Ready for limited real-provider certification?** **Conditionally:** **process and checklist are ready**; **execution was not run** in this document. Prerequisites: sandbox/safe env, operator map, timeouts, runbooks.
4. **Remaining work before any “stronger than Ding/Rebtel”-style claim:** **Not measured here.** Substantively: reproduce **500+** with **explicit worker/pool limits** or infra scaling; complete **R1→R3 real-provider** certification; multi-instance behavior; production SLOs. **No competitor comparison is supported** by these lab JSON files.
