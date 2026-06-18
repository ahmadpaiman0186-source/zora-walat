# L-86D — PR #5 useful gap inventory

**Source:** L-86C findings + L-86D patch/theme analysis

---

## Tier 1 — Primary focus (unique on PR #5, absent from `main`)

| Artifact | Type | On `main`? | Useful gap? |
|----------|------|------------|-------------|
| `server/test/stripeWebhookDisputeRetrieve503.test.js` | HTTP webhook test (+157 lines) | **NO** | **YES** — specifies pre-tx 503 contract |
| `server/test/stripeClientTestOverrideGuard.test.js` | Unit guard test (+35 lines) | **NO** | **CONDITIONAL** — depends on override API |

## Tier 2 — Supporting runtime (PR #5 only; required by Tier 1 tests)

| Artifact | Purpose | On `main`? |
|----------|---------|------------|
| `setStripeClientOverrideForTests` / `clearStripeClientOverrideForTests` in `stripe.js` | Inject mock Stripe for HTTP tests | **NO** |
| `resolvePhase1DisputePaymentIntentForWebhook` | Pre-transaction dispute PI resolution | **NO** |
| `DisputeChargeLookupError` | Signal lookup failure → route 503 | **NO** |
| Pre-tx block in `stripeWebhook.routes.js` | Return **503** before `$transaction` on lookup failure | **NO** |

## Tier 3 — Superseded on `main` (not useful to port from PR branch)

| Artifact | PR action | `main` status |
|----------|-----------|---------------|
| `readinessBoundedChecks.js` | add | **Present** |
| `readinessBoundedChecks.test.js` | add | **Present** |
| `health.routes.js` bounded probes | modify | **Present** (parallel) |
| `phase1StripeChargeIncidents.js` core dispute mapping | modify | **Present** (in-tx lookup) |
| `phase1StripeChargeIncidents.test.js` | modify | **Present** (overlap) |
| `phase1Resilience.integration.test.js` dispute cases | modify | **Present** — includes `charges.retrieve` success path |
| `stripeWebhook.routes.js` in-tx dispute handler | modify | **Present** — no pre-tx 503 path |
| `server/.gitignore` | +1 line | Low priority / verify at rebuild |

## Behavioral gap (core finding)

| Contract | PR #5 | Current `main` |
|----------|-------|----------------|
| Dispute without `payment_intent`, `charges.retrieve` fails | **HTTP 503**, **no** `$transaction` | In-tx lookup fails → log/events → `{ updated: 0 }`, tx may still commit → likely **200** to Stripe |
| Dispute with `payment_intent` | 200, no retrieve | **Same intent** — covered by `stripeWebhookHttpChaos` + resilience tests |

---

*End.*
