# L-86E-0 — Contract options matrix

**Decision under review:** dispute without `payment_intent` + failed `charges.retrieve`

---

## Option A — Pre-transaction fail-closed (PR #5 style)

| Dimension | Assessment |
|-----------|------------|
| HTTP on lookup failure | **503** |
| `$transaction` | **Not entered** |
| Stripe delivery | **Retries** (5xx) — may recover if Stripe API transient |
| Idempotency | Event id **not** stored until success path — retries are fresh attempts |
| Auditability | No DB event row on failure — ops events only if implemented pre-tx |
| No-pay-no-service | No erroneous DISPUTED row — **good** |
| Money-path risk | Fail-closed — **no false dispute state** |
| Operational risk | Retry storms during prolonged Stripe outage |
| Implementation | **Runtime + tests** — route pre-tx resolver, `DisputeChargeLookupError`, optional test override |
| Alignment with current `main` | **NO** — behavior change |

## Option B — Current main graceful (in-transaction)

| Dimension | Assessment |
|-----------|------------|
| HTTP on lookup failure | **200** `{ received: true }` |
| `$transaction` | **Commits** — webhook event persisted |
| Stripe delivery | **No retry** (2xx ack) |
| Idempotency | Event id stored — duplicates blocked on replay |
| Auditability | Webhook event + audit + `charge_dispute_unmapped` / lookup_failed events |
| No-pay-no-service | **No DISPUTED row** when unmapped — incident status unchanged |
| Money-path risk | **Ack without mapping** — support must use ops events / manual follow-up |
| Operational risk | **Silent** from Stripe's view — no automatic retry for mapping recovery |
| Implementation | **Tests-only** to codify current contract (L-86E-1) |
| Alignment with current `main` | **YES** — de facto contract |

## Option C — Defer contract choice

| Dimension | Assessment |
|-----------|------------|
| Action now | **No** L-86E-1 implementation |
| Rationale | L-85M **NO PASS**; L-85X deploy surface unproven on staging |
| PR #5 | **KEEP_OPEN_BLOCKED** |
| Risk | Governance clarity delayed; **no** accidental runtime drift |
| L-86E-1 | **Deferred** until proof-chain stabilization |

---

## Summary table

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Matches current `main` runtime | NO | **YES** | N/A |
| Stripe retries on lookup fail | YES | NO | N/A |
| DB event row on lookup fail | NO | YES | N/A |
| Runtime change required | **YES** | NO | NO |
| Safe without staging webhook proof | **NO** | Partial (local tests only) | **YES** |
| Recommended for **immediate** adoption | NO | Document only | **YES** |

---

*End.*
