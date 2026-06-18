# L-86D — PR #5 superseded content map

**Baseline:** `main` @ `49c3763`

---

## Supersession summary

| Category | Count | Port from PR #5? |
|----------|-------|------------------|
| Fully superseded runtime modules | **5** | **NO** |
| Partially superseded (different contract) | **2** | **NO verbatim** — redesign if needed |
| Unique tests + hooks | **2–4** | **Rebuild on `main`** in L-86E |
| Meta/config | **1** | Verify only |

## File map

| PR #5 file | Superseded? | `main` evidence |
|------------|-------------|-----------------|
| `readinessBoundedChecks.js` | **YES** | `server/src/lib/readinessBoundedChecks.js` |
| `readinessBoundedChecks.test.js` | **YES** | `server/test/readinessBoundedChecks.test.js` |
| `health.routes.js` | **YES** (thematic) | Imports bounded checks; extended snapshots |
| `phase1StripeChargeIncidents.js` | **PARTIAL** | Dispute/refund logic + `orchestrateStripeCall`; **in-tx** failure handling differs from PR pre-tx 503 |
| `phase1StripeChargeIncidents.test.js` | **PARTIAL** | Unit tests for dispute PI/charge parsing exist |
| `phase1Resilience.integration.test.js` | **PARTIAL** | Dispute + charge lookup **success** integration |
| `stripeWebhook.routes.js` | **PARTIAL** | `charge.dispute.created` in tx; **no** `DisputeChargeLookupError` / pre-tx 503 |
| `stripe.js` | **NO** for override API | Singleton only; no test override exports |
| `stripeWebhookDisputeRetrieve503.test.js` | **N/A** | **Absent** — unique |
| `stripeClientTestOverrideGuard.test.js` | **N/A** | **Absent** — unique |
| `.gitignore` | **UNKNOWN** | Trivial delta |

## Proof-chain supersession

Ap786 **L-85I–L-86C** supersedes governance for legacy PR workflow. PR #5 runtime themes were absorbed incrementally on `main` without merging PR #5. **L-85M NO PASS** — no claim that current webhook behavior is provider-proven on staging.

---

*End.*
