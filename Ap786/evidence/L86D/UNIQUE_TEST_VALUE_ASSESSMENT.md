# L-86D — Unique test value assessment

**Read-only — no test execution, no live Stripe**

---

## 1. `stripeWebhookDisputeRetrieve503.test.js`

### What PR #5 test encodes (patch summary)

| Scenario | Expected behavior in PR #5 |
|----------|---------------------------|
| `charge.dispute.created` without `payment_intent`, `charges.retrieve` throws | **HTTP 503**, `success: false`, `INTERNAL_ERROR`, **`prisma.$transaction` call count = 0** |
| `charge.dispute.created` with `payment_intent` on payload | **HTTP 200**, `received: true`, **`charges.retrieve` not called**, transaction runs |

### Overlap with current `main`

| Existing test | Covers |
|---------------|--------|
| `phase1Resilience.integration.test.js` | Service-level `applyPhase1DisputeCreated` with mock stripe — **success** lookup path |
| `stripeWebhookHttpChaos.integration.test.js` | HTTP dispute with `payment_intent` on payload → **200** |

### Gap vs `main`

| Gap | Unique value? |
|-----|---------------|
| HTTP-level **503** when charge lookup fails pre-transaction | **YES** — **not tested on `main`** |
| Assert **no DB transaction** on lookup failure | **YES** — **not tested on `main`** |
| Negative assertion on `charges.retrieve` when PI present | **PARTIAL** — similar intent at service layer only |

### Portability verdict

| Verdict | Detail |
|---------|--------|
| **Not directly portable** | Current `main` does **not** implement pre-tx 503; tests would **fail** without runtime changes |
| **Useful as specification** | **YES** — documents desired fail-closed money-path contract **if** operator selects PR #5-style behavior |
| **Alternative rebuild** | New tests asserting **current** in-tx graceful degradation (200 + unmapped incident) — different file/assertions |

**Recommendation:** **Rebuild as new tests on `main`** — either after adopting pre-tx 503 contract **or** rewritten to document current contract. **Do not** cherry-pick file verbatim without contract gate.

---

## 2. `stripeClientTestOverrideGuard.test.js`

### What PR #5 test encodes

| Scenario | Expected behavior |
|----------|-------------------|
| `setStripeClientOverrideForTests` when `NODE_ENV=production` | **Throws** — money-path safety guard |
| Uses `clearStripeClientOverrideForTests` in teardown | Test hygiene |

### Overlap with current `main`

| Finding | Detail |
|---------|--------|
| `setStripeClientOverrideForTests` on `main` | **Absent** (grep: no matches) |
| Other mock patterns | Integration tests pass `{ stripe: mockStripe }` into `applyPhase1DisputeCreated` directly |
| Production guard for global override | **Not present** — **unique concern** |

### Portability verdict

| Verdict | Detail |
|---------|--------|
| **Depends on PR #5 `stripe.js` hooks** | Cannot port test alone |
| **Unique value** | **CONDITIONAL YES** — valuable **if** L-86E introduces test override for HTTP webhook tests |
| **Alternative** | Skip global override; use dependency injection at route level or supertest with env-guarded hooks per existing chaos tests |

**Recommendation:** **Defer** until L-86E chooses test strategy. If override API adopted, rebuild guard test **with** `stripe.js` exports. If not, **reject as obsolete** (prefer explicit mock injection).

---

## Summary decision matrix

| File | Rebuild on `main` | Reject obsolete | Defer |
|------|-------------------|-----------------|-------|
| `stripeWebhookDisputeRetrieve503.test.js` | **YES** (after contract decision) | — | **YES** until L-85M / webhook proof stable |
| `stripeClientTestOverrideGuard.test.js` | **Conditional** | **If no override API** | **YES** |

---

*End.*
