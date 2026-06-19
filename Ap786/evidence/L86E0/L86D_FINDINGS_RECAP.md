# L-86E-0 — L-86D findings recap

**Source:** merged `Ap786/evidence/L86D/`

---

## Verified preconditions (carried forward)

| Fact | Value |
|------|--------|
| Only open PR | **#5** — L27 dispute webhook hardening |
| PR #5 disposition | **KEEP_OPEN_BLOCKED** |
| Direct merge PR #5 | **NO** |
| PR #5 behind `main` | **634+ commits** (L-86C/D) |

## L-86D core finding

**Behavioral contract mismatch** for `charge.dispute.created` when dispute lacks `payment_intent` and `charges.retrieve` fails:

| | PR #5 (Option A style) | Current `main` (Option B style) |
|---|------------------------|----------------------------------|
| Lookup timing | **Pre-transaction** | **Inside** `$transaction` |
| Lookup failure HTTP | **503** | **200** `{ received: true }` (success path) |
| DB transaction on lookup failure | **Avoided** | **Runs** — event row + audit persisted |
| Incident row on lookup failure | N/A (no tx) | **`updated: 0`** — operational events emitted |

## Useful gaps (L-86D)

| Artifact | Unique value |
|----------|--------------|
| `stripeWebhookDisputeRetrieve503.test.js` | Specifies Option A — **not portable** to `main` without runtime change |
| `stripeClientTestOverrideGuard.test.js` | Conditional — needs test override API absent on `main` |
| Most runtime modules | **Superseded** on `main` |

## L-86D rebuild plan prerequisite

**Contract decision before L-86E implementation** — this gate (L-86E-0) satisfies that prerequisite as evidence-only.

---

*End.*
