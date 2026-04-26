# Reloadly sandbox — bounded golden-path rehearsal

**Scope:** One **sandbox** airtime fulfillment path through this codebase (not production certification).  
**SKU (example):** Catalog **Roshan** airtime face **$10 USD** — internal product id suffix **`air_25m`** (see `src/lib/pricing.js` / app catalog); **`operatorKey`** = `roshan`.  
**Assumption:** `RELOADLY_OPERATOR_MAP_JSON` contains a numeric Reloadly operator id for **`roshan`** valid in **your** sandbox account.

## Preconditions (fail = stop)

Run **`npm run reloadly:golden-path-preflight`** first — exits **1** if sandbox / airtime / credentials / **`roshan`** operator mapping are not aligned (no provider HTTP).

| # | Check | Pass |
|---|--------|------|
| P1 | Env | `RELOADLY_SANDBOX=true`, `AIRTIME_PROVIDER=reloadly`, credentials set |
| P2 | Static report | `npm run reloadly:sandbox-readiness` → summary lines show readiness for Reloadly + pipeline vars you use |
| P3 | Operator map | JSON maps `roshan` → non-empty numeric id |
| P4 | API + DB | `DATABASE_URL` migrated; Stripe test + webhook secret if using Stripe checkout path |
| P5 | Worker (if queue mode) | `FULFILLMENT_QUEUE_ENABLED=true`, `REDIS_URL`, `npm run worker:fulfillment` running |

## Golden path (happy path)

1. **Create a real `PaymentCheckout`** for **`roshan_air_25m`** (amount meets Phase 1 minimums) through your normal **authenticated checkout** API (same as production code path).
2. **Pay** with Stripe test mode so **`checkout.session.completed`** fires (or equivalent Phase 1 payment success for your test harness).
3. **Observe webhook** logs: event processed, no amount mismatch, fulfillment scheduled.
4. **Fulfillment:** wait for attempt **QUEUED → PROCESSING → SUCCEEDED** (or sandbox-expected terminal success) via DB admin tools or **`GET /api/transactions/:id`** as the owning user.
5. **Trust API:** Response shows coherent **`trackingStageKey`** / **`trustStatusKey`**, optional **`providerReferenceSuffix`** after success.

## Pass / fail criteria

| Outcome | Criteria |
|---------|-----------|
| **PASS** | Order reaches **paid** + fulfillment **SUCCEEDED** (or your org’s documented sandbox-success equivalent); provider reference present; no unhandled `STRIPE_AMOUNT_MISMATCH` / mapping errors in logs; transaction API shows **delivered** (or verifying→delivered within agreed timeout). |
| **FAIL — config** | `operator_unmapped`, missing Reloadly credentials, `RELOADLY_SANDBOX` false while using test keys, readiness script NOT READY. |
| **FAIL — provider** | Reloadly HTTP/auth errors, operator id invalid for sandbox account, persistent **pending_verification** past agreed SLA — **document and escalate**; not fixed by re-running blindly. |
| **INCONCLUSIVE** | Sandbox outage, rate limits, or ambiguous body without transactionId — treat as **provider rehearsal gap**, not app “PASS”. |

## What this does **not** prove

- Production Reloadly or carrier behavior  
- Commercial limits, pricing, or dispute handling at scale  
- Full support / refund playbooks  

## Evidence to capture

- `orderId`, Stripe PaymentIntent id (if any), Reloadly `transactionId` / reference from logs or admin  
- Timestamped log lines for webhook + fulfillment attempt  
- Screenshot or JSON of **`GET /api/transactions/:id`** when terminal  

## Observed verification in this repository pass

- **`npm run reloadly:golden-path-preflight`** — run in a configured workspace; **exit 0** only when sandbox + reloadly airtime + **`roshan`** map + creds pass static gates (still **no** provider HTTP).
- **`npm run reloadly:sandbox-readiness`** — **READY** when env presence is complete (does not submit a top-up).
- **End-to-end paid order → Reloadly POST** remains **operator-executed**; capture evidence per “Evidence to capture” above.
