# Global engineering repair log — 2026-05-18

Safe changes only. No payment/ledger/refund behavior changes.

---

## REP-001 — Checkout session log redaction

| Field | Value |
|-------|--------|
| **File** | `server/src/controllers/paymentController.js` |
| **Why** | `console.log('STRIPE_SESSION_CREATED', session.id)` and pino `sessionId` logged full Stripe Checkout session ids (correlation surface / log leakage). |
| **Risk** | **Low** — observability only |
| **Runtime behavior** | Log field names/shape change (`sessionId` → `sessionIdSuffix`); audit DB still stores full id in controlled payload (existing). |
| **Tests** | No new test; pattern matches existing `safeSuffix` usage elsewhere in file |
| **Rollback** | Revert single hunk in `paymentController.js` |

---

## REP-002 — Ap786 global audit pack (this commit)

| Field | Value |
|-------|--------|
| **Files** | `Ap786/GLOBAL_ENGINEERING_*.md`, `AP786_EVIDENCE_INDEX.txt` update |
| **Why** | Required audit deliverables; honest PASS/PARTIAL labeling |
| **Risk** | **None** (docs only) |
| **Rollback** | Revert doc commit |

---

## REP-003 — L-11 mapping diagnostics and refund-safety hardening

| Field | Value |
|-------|--------|
| **Files** | `stagingOperatorL11StripeMapping.mjs`, `stagingOperatorL11StripeDiagnose.mjs`, `stagingOperatorL11Refund.mjs`, `stagingOperatorL11Discover.mjs`, `staging-auth-checkout-operator.mjs`, `stagingOperatorCliSafety.mjs`, `slimStagingOperatorRefundableCandidatesHandler.mjs`, L11 unit tests |
| **Why** | Operator blocked on `stripe_order_metadata_mismatch` despite full PI retrieve; suffix false negatives; missing `order_id_present` check caused false `missing_order_id` on target path |
| **Risk** | **Low** — read-only operator/diagnose paths; execute still gated by approval phrase + `stripe.verified`; no refund executed in audit |
| **Runtime behavior** | New modes `l11-mapping-diagnose`, `l11-refresh-order-ref`; discover scores candidates via test-key Stripe; metadata mismatch downgrades to warning only with strong PI proof; verdicts `READY_FOR_OPERATOR_APPROVAL` / `READY_WITH_METADATA_WARNING` (never L-11 PASS) |
| **Tests** | `stagingOperatorL11StripeDiagnose.test.js`, `stagingOperatorL11StripeMapping.test.js`, `stagingOperatorL11Refund.test.js`, `stagingOperatorL11Discover.test.js`, `stagingOperatorCliSafety.test.js` — **43/43 PASS** (focused, no DB) |
| **Rollback** | Revert commit `fix(operator): harden L11 mapping diagnostics and refund safety` |

---

## Not changed (explicit)

- Ledger posting logic  
- Webhook verification crypto  
- Refund **execution** (no `l11-refund-execute` run in audit)  
- `.env` / secrets  
- Database schema  
