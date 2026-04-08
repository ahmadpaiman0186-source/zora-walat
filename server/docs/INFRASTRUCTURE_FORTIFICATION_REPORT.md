# Phase 1 infrastructure fortification — BullMQ fulfillment queue (honest report)

**Scope:** Backend-only. No new products, countries, or UI. Goal: replace unbounded in-process fulfillment fan-out with a **phase-scoped BullMQ queue**, **bounded worker concurrency**, **class-aware job retries**, and **operator visibility**.

---

## A. Root bottleneck diagnosis (legacy 500 failure)

**Observed (pre-queue):** With **500** parallel `processFulfillmentForOrder` calls on one Node process, **273** reached `FULFILLED`, **96** `invokeErrors`, **96** stuck `PAID`, **131** stuck `PROCESSING`, **0** duplicate-SUCCEEDED, **0** coherence violations (`ELITE_SCALE_CERTIFICATION_REPORT.md`).

**Diagnosis:** **Postgres + Prisma client pool contention** under **uncapped parallelism** — not a duplicate-claim logic regression. Correctness signals stayed clean while infra saturated.

**Direction:** **Decouple intake from execution** — accept many paid orders into a queue, but run heavy fulfillment with **`FULFILLMENT_WORKER_CONCURRENCY`** (default **32**) per worker process.

---

## B. Queue / worker architecture added

| Piece | Path / command |
|-------|----------------|
| Queue name | `phase1-fulfillment-v1` (`src/queues/phase1FulfillmentQueueName.js`) |
| Redis (BullMQ) | `src/queues/bullmqRedis.js` — **ioredis**, `maxRetriesPerRequest: null` |
| Queue singleton | `src/queues/phase1FulfillmentQueue.js` |
| Producer | `src/queues/phase1FulfillmentProducer.js` — `jobId = orderId` (dedupe / idempotent enqueue) |
| Worker | `src/queues/phase1FulfillmentWorker.js` |
| Worker entry | `fulfillment-worker.mjs` → **`npm run worker:fulfillment`** |
| Drain helper | `src/queues/phase1FulfillmentQueueDrain.js` |
| Scheduling | `scheduleFulfillmentProcessing` + `processPendingPaidOrders` enqueue when `FULFILLMENT_QUEUE_ENABLED=true` + `REDIS_URL` (`fulfillmentProcessingService.js`) |
| HTTP client kick | `rechargeController.postExecute` — enqueue + **poll DB** until terminal or **504** (`fulfillmentClientWait.js`) |
| Fortress recert | `FORTRESS_PROBE_USE_FULFILLMENT_QUEUE=true` — in-process worker + enqueue all + drain (`transaction-fortress-concurrency-probe.mjs`) |

**Env:**

- `FULFILLMENT_QUEUE_ENABLED=true` (requires `REDIS_URL`)
- `FULFILLMENT_WORKER_CONCURRENCY` (default **32**)
- `FULFILLMENT_JOB_MAX_ATTEMPTS`, `FULFILLMENT_JOB_BACKOFF_MS`, `FULFILLMENT_CLIENT_EXECUTE_WAIT_MS`

**Important:** The **API process does not embed the worker**. If queue is on and **no worker runs**, paid rows stay **PAID + QUEUED** until a worker consumes jobs (backup cron still enqueues / falls back inline on enqueue failure).

---

## C. Retry / dead-letter design

- **Transient** errors (`TRANSIENT_DB`, `TRANSIENT_STRIPE`, `TRANSIENT_PROVIDER` per `classifyTransactionFailure`): worker **rethrows** → BullMQ **exponential backoff** + **`FULFILLMENT_JOB_MAX_ATTEMPTS`** (default 8).
- **Non-transient** / unknown: **`UnrecoverableError`** → job **fails** without endless retry (no extra real provider sends from retries for permanent classes).
- **Failed jobs** remain in BullMQ **failed** set (`removeOnFail: false`) for support visibility.
- **Structured logs:** `fulfillmentWorker` JSON lines on `bullmq_completed_event`, `bullmq_failed_event`, transient retry, unrecoverable fail.

**Note:** `processFulfillmentForOrder` still **swallows most internal failures** into row state; BullMQ retries primarily help **thrown** errors (e.g. pool/timeouts) at the worker boundary.

---

## D. DB pressure reductions

- **Bounded concurrency** — primary lever: at most **N** concurrent heavy fulfillments per worker vs **N = order burst** before.
- **Narrow transaction** discipline unchanged: provider I/O **outside** DB tx; margin + loyalty in completion tx (existing design). `scheduleFinancialTruthRecompute` already **non-blocking** (`setImmediate`).
- **Comment** on hot-path peek in `processFulfillmentForOrderInner` (`fulfillmentProcessingService.js`).
- **Operational:** tune Prisma **`DATABASE_URL`** with appropriate **`connection_limit`** / pool for **`worker_concurrency × worker_replicas + API headroom`** (not auto-set in code).

---

## E. Ops / monitoring visibility

| Surface | What |
|---------|------|
| `GET /ops/fulfillment-queue` (staff) | `getPhase1FulfillmentQueueMetrics`: queued/waiting/delayed/**active**/completed/**failed**, **oldestQueuedAgeMs**, **oldestProcessingAgeMs**, configured concurrency |
| `GET /ops/summary?fulfillmentQueue=1` | Same metrics embedded |
| `GET /ops/order-health?id=…` | `stagingHint` (queued vs processing vs terminal), `bullmqJobState`, `fulfillmentQueueEnabled` |
| Startup | Log line when queue mode on reminding to run **`npm run worker:fulfillment`** |

---

## F. Same-order regression result

**PASS** — `transactionFortressConcurrency.integration.test.js` (2026-04-07 run): duplicate webhook idempotency, **two concurrent `processFulfillmentForOrder`** → single PROCESSING claim, parallel distinct orders, dispute gate. Tests use **direct** `processFulfillmentForOrder` (intentional — exercises DB claim layer).

---

## G. Loyalty-on regression result

With **`FULFILLMENT_QUEUE_ENABLED` unset/false** (default dev), fulfillment remains **inline**; loyalty path unchanged. **Dedicated post-change loyalty JSON** may be generated locally via:

```powershell
$env:FORTRESS_PROBE_QUIET='true'
$env:FORTRESS_PROBE_DISTINCT_ORDERS='10'
$env:FORTRESS_PROBE_SAME_ORDER_RACES='0'
$env:FORTRESS_PROBE_LOYALTY_AUTO_GRANT='true'
node scripts/transaction-fortress-concurrency-probe.mjs
```

Prior **`elite-loyalty-recheck.json`** (10/10 + 10 grant + 10 ledger) remains valid evidence for the last full probe on this codebase before queue wiring; schema + side-effect parity is unchanged for **inline** mode.

---

## H. 500 rerun result (queue mode)

**Not executed in this workspace:** `FORTRESS_PROBE_USE_FULFILLMENT_QUEUE` probe **exited early** because **`FULFILLMENT_QUEUE_ENABLED` + `REDIS_URL`** were not both active in the probe environment.

**Command when Redis is available:**

```powershell
cd server
$env:FULFILLMENT_QUEUE_ENABLED='true'   # and REDIS_URL in .env
$env:FORTRESS_PROBE_QUIET='true'
$env:FORTRESS_PROBE_USE_FULFILLMENT_QUEUE='true'
$env:FORTRESS_PROBE_DISTINCT_ORDERS='500'
$env:FORTRESS_PROBE_SAME_ORDER_RACES='0'
$env:FORTRESS_PROBE_LOYALTY_AUTO_GRANT='false'
node scripts/transaction-fortress-concurrency-probe.mjs
```

Optional: tune `FULFILLMENT_WORKER_CONCURRENCY` (e.g. 32–64) before certifying on your Postgres pool size.

---

## I. What still blocks 1000

1. **Measured 500 queue-mode pass** not recorded here (Redis required).
2. **1000** — same as 500 + longer drain / DB teardown time; validate pool + queue depth under sustained load.
3. **Multi-worker / multi-node** — metrics show **configured** concurrency, not cluster-wide worker discovery (OSS BullMQ limitation without extra instrumentation).

---

## J. Harsh scorecard (/10)

| Criterion | Score | Notes |
|-----------|------:|-------|
| Queue design | **8** | Explicit name, idempotent `jobId`, producer/worker split |
| Overload safety | **7** | Bounded concurrency; overload visible via `/ops/fulfillment-queue` |
| Duplicate-proofing preservation | **8** | Same-order + fortress integration still PASS; DB gates unchanged |
| Retry safety | **7** | Transient vs `UnrecoverableError`; inner fulfillment still mostly non-throwing |
| DB resilience | **6** | Depends on pool sizing + measured load; not auto-tuned |
| Operator visibility | **7** | Queue metrics + order-health hints + failed job retention |
| Overall infrastructure maturity | **7** | **Strong direction**; **500 queue recert pending** where Redis is available |

**Trust:** No competitor claims; mock/load proof remains **environment-specific**.
