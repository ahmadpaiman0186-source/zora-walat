# L-86D — Rebuild plan on current main

**Implementation-free — for separately authorized L-86E only**

---

## Principles

1. **Never merge PR #5** — rebuild from `main` @ post-L-86C.
2. **Contract first** — choose dispute lookup failure semantics before writing tests.
3. **Minimal surface** — prefer tests that match **chosen** runtime contract; no duplicate L-86C coverage.
4. **No L-86E work in L-86D** — this document is plan-only.

---

## Phase 0 — Operator contract decision (L-86E pre-requisite)

| Option | Behavior | Tests to rebuild |
|--------|----------|------------------|
| **A — PR #5 fail-closed** | Pre-tx `charges.retrieve`; failure → **503**, no `$transaction` | Port/adapt `stripeWebhookDisputeRetrieve503.test.js` + route/service helpers |
| **B — Current main graceful** | In-tx lookup failure → log/events, `{ updated: 0 }`, likely **200** ack | **New** HTTP test: dispute without PI, mock retrieve fail → 200 + no incident row (or unmapped) |
| **C — Defer** | No change until L-85M + staging webhook proof pass | Hold L-86E |

**L-86D recommendation:** **Option C defer** default; if proceeding, require explicit operator pick of **A** or **B**.

---

## Phase 1 — Test infrastructure (only if Option A or HTTP mock needed)

| Step | Action | Files (indicative) |
|------|--------|-------------------|
| 1.1 | Decide: global `setStripeClientOverrideForTests` vs route-level DI | `stripe.js` or webhook test helper |
| 1.2 | If override API: add production guard + `stripeClientTestOverrideGuard.test.js` rebuild | `server/src/services/stripe.js`, new unit test |
| 1.3 | If no override: document rejection in L-86E evidence | — |

---

## Phase 2 — Dispute HTTP tests (L-86E core)

| Step | Action | Notes |
|------|--------|-------|
| 2.1 | Create branch from `main`: e.g. `feature/l86e-dispute-webhook-test-rebuild` | **Not in L-86D** |
| 2.2 | Implement tests per Phase 0 contract | Do **not** copy PR #5 patches blindly |
| 2.3 | Reuse patterns from `stripeWebhookHttpChaos.integration.test.js` for signed POST | Existing harness |
| 2.4 | Run `npm test` scoped to new files | L-86E gate |
| 2.5 | Evidence: test list, contract chosen, CI result | Ap786/evidence/L86E/ |

---

## Phase 3 — PR #5 disposition (after L-86E, separate authorization)

| Outcome | PR #5 action |
|---------|--------------|
| L-86E proves parity (Option A or B) | Operator may authorize **CLOSE_SUPERSEDED** on PR #5 |
| Gaps rejected as obsolete | Same — with evidence |
| L-86E deferred | **KEEP_OPEN_BLOCKED** unchanged |

---

## Explicit non-actions in L-86D

- No runtime code changes
- No test port
- No implementation branch
- No push
- No PR #5 GitHub mutation

---

*End.*
