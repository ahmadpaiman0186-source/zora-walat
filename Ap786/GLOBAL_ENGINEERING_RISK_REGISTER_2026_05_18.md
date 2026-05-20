# Global engineering risk register — 2026-05-18

| ID | Risk | Severity | Likelihood | Status | Mitigation / proof |
|----|------|----------|------------|--------|-------------------|
| R-01 | Accidental **live Stripe** key in staging/CI | Critical | Low | Mitigated | `stripeEnv.js`, preflight, operator L11 refuses `sk_live_` |
| R-02 | **Refund** executed without dual control | Critical | Low | Mitigated | `L11_REFUND_APPROVAL` phrase + spawn tests; **no execute in audit** |
| R-03 | **Duplicate webhook** double fulfillment | Critical | Medium | Mitigated | P2002 + idempotent ledger; chaos integration tests |
| R-04 | **Slim webhook** path skips fulfillment dispatch on crash-before-schedule | High | Medium | Partial | Replay schedules dispatch on P2002 duplicate path (code comment) |
| R-05 | **Redis down** with queue enabled | High | Medium | Partial | Inline fallback on enqueue failure; not fully integration-tested |
| R-06 | **Serverless cold start** drops auth/checkout | High | Medium | Partial | Slim routes added; must verify correct Vercel routing table |
| R-07 | **False PASS** in investor-facing docs | Medium | Medium | Open | This audit; index distinguishes PLAN vs PASS |
| R-08 | **Full Stripe session id** in stdout logs | Medium | Low | Mitigated | Suffix-only logging fix 2026-05-18 |
| R-09 | **Bootstrap** logs webhook secret tail | Low | Medium | Accepted | Operator alignment; not full secret |
| R-10 | **L6/L7** staging replay not run | Medium | Medium | Open | Automated PASS only |
| R-11 | **Prisma 6→7** breaking upgrade | Medium | Low | Open | Not started |
| R-12 | **Integration DB** “too many clients” locally | Medium | Medium | Partial | Pool limits in test preload; operator discipline |
| R-13 | **Reloadly live** outbound misconfig | Critical | Low | Mitigated | Gates + placeholder map checks in preflight |
| R-14 | **Operator CLI** paste concatenation | Medium | Medium | Mitigated | `stagingOperatorCliSafety` detection |
| R-15 | **Evidence deletion** | Low | Low | Mitigated | Audit rule: do not delete Ap786 files |
| R-16 | **L-11 false PASS** on refund-target without Stripe verify | Critical | Low | Mitigated | Target requires `stripe.verified`; execute guards unchanged; tests in `stagingOperatorL11Refund.test.js` |
| R-17 | **L-11 metadata-only** Stripe linkage on hosted Checkout | High | Medium | Partial | Strong PI id + amount/currency/livemode proof → `PASS_WITH_METADATA_WARNING`; session metadata path; discover/refresh modes |
| R-18 | **Stale `.staging-order-id.local`** for L-11 | Medium | Medium | Partial | `stale_db_payment_intent_suffix`, `l11-discover-refundable-order`, `l11-refresh-order-ref` (local file only) |

**Rollback note:** Money-path regressions → redeploy previous Vercel deployment; set `PAYMENTS_LOCKDOWN_MODE=true` to freeze new checkouts without stopping webhook ingestion (see `DEPLOYMENT_READINESS.md`).
