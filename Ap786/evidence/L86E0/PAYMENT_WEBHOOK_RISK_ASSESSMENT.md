# L-86E-0 — Payment / webhook risk assessment

**Read-only — no live Stripe, no webhook replay**

---

## Stripe delivery retry implications

| Contract | Lookup failure behavior | Stripe side |
|----------|----------------------|-------------|
| **A — 503** | Non-2xx → Stripe retries with backoff | May eventually map if API recovers; risk of retry load |
| **B — 200 ack** | 2xx → delivery considered successful | **No** automatic retry — mapping failure is terminal for that delivery |

## Idempotency

| Contract | First delivery (lookup fail) | Replay |
|----------|------------------------------|--------|
| **A** | No `StripeWebhookEvent` row | Retries may succeed later; no P2002 on first attempt |
| **B** | Event row committed | Replays hit duplicate handling — **won't re-attempt lookup** unless special replay logic added |

**Implication:** Option B trades **retry recovery** for **delivery finality**. Option A trades **delivery finality** for **retry recovery**.

## Auditability / support

| Contract | Support visibility |
|----------|-------------------|
| **A** | Failure visible as HTTP 503 + logs; no consumed event in DB |
| **B** | `charge_dispute_charge_lookup_failed` + `charge_dispute_unmapped` ops events; webhook event row proves receipt |

Both emit operational telemetry on `main` (Option B path today). Option A requires new pre-tx logging if adopted.

## No-pay-no-service / false dispute state

| Contract | False DISPUTED row on lookup failure? |
|----------|--------------------------------------|
| **A** | **NO** — no transaction |
| **B** | **NO** — `{ updated: 0 }`; checkout row unchanged |

Both avoid marking checkout DISPUTED without resolved PI.

## Payment / provider proof chain

| Factor | Impact |
|--------|--------|
| L-85M blocked | Cannot claim staging webhook behavior is proven |
| L-85X entrypoint | Which handler runs on staging is **not** claim-grade verified |
| Changing to Option A | **Material** money-path behavior change — requires explicit gate + proof |
| Codifying Option B in tests | **Lower** risk — documents existing behavior |

## Global claim-grade standard

**No option** in this gate provides production / provider / real-money / market proof. Contract choice is **engineering governance only**.

---

*End.*
