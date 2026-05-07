# L19 — Chaos & money-path failure verification

This document records **where** Phase 1 money-path chaos and resilience behavior is proven in **local/CI-safe** tests (no live Stripe charges, no live Reloadly; see `test/integrations/registerChaosWebhookEnv.mjs` for HTTP chaos overrides).

## How to run (server)

- Schema: `npx prisma validate`
- After pulling migrations: `npx prisma generate` and `npm run db:migrate:integration` (or your env’s `prisma migrate deploy`) so the Prisma client matches `schema.prisma`.
- Unit: `npm test` (includes `test/l11ChaosReliabilityHarness.test.js` and `test/phase1FulfillmentQueueDegrade.test.js`).
- Integration (includes chaos webhook batch): `npm run test:integration` (runs `stripeWebhookHttpChaos.integration.test.js` and `l11LedgerWebhookRollback.integration.test.js` in the second half with `registerChaosWebhookEnv.mjs`).

## Coverage matrix

| L19 concern | Evidence |
|-------------|----------|
| Duplicate `checkout.session.completed` / same Stripe event id | `test/integrations/phase1MoneyPath.test.js` (P2002), `sprint4PaymentLoopProof.integration.test.js`, `sprint5ReconciliationTraceability.integration.test.js`, `stripeWebhookHttpChaos.integration.test.js` |
| Webhook retry / out-of-order / partial failure | `stripeWebhookHttpChaos.integration.test.js`, `phase1Resilience.integration.test.js`, `l11LedgerWebhookRollback.integration.test.js` |
| Queue off / producer cannot enqueue (safe degrade) | `test/phase1FulfillmentQueueDegrade.test.js` (`queue_unavailable`); `src/queues/phase1FulfillmentProducer.js`; chaos preload sets `FULFILLMENT_QUEUE_ENABLED=false` for HTTP chaos |
| Stale PAID/PROCESSING / stuck signals | `phase1Resilience.integration.test.js`, `selfHealingMoneyPath.integration.test.js`, `test/selfHealingOrchestrator.test.js` |
| Provider timeout / mock path | `AIRTIME_PROVIDER=mock` in chaos preload; mock adapter in fulfillment path; resilience + chaos suites exercise mock I/O |
| DB constraint / idempotency | Phase 1 money path + sprint proofs + fortress concurrency tests |
| Concurrency / fortress | `transactionFortressConcurrency.integration.test.js`, `transactionFortressGate.test.js` |
| Reconciliation / drift repair | `moneyPathReconInconsistent.integration.test.js`, sprint 5 traceability, reconciliation scripts referenced in `package.json` |
| Fraud / abuse gates (non-destructive) | Unit tests under `test/webtop*.test.js`, `proof:fraud-controls-local` |
| DLQ (dead-letter **trail**) | **Static verification**: `src/services/phase1FulfillmentDlqService.js` — Redis-backed visibility list; replay gated by `phase1FulfillmentReplayDiscipline.js` + admin path (no automated DLQ replay in CI by design) |

## Fail-safe properties asserted in tests

- No second fulfillment ledger mutation for the same Stripe event id / fortress replay after terminal states (`duplicate_event`, `terminal_conflict`, `fortress_idempotency_noop` in chaos logs).
- Webhook signature verification unchanged in chaos path (synthetic `whsec_` + signed payloads only).

## Related docs

- `docs/INTEGRATION_AND_E2E_TESTS.md`, `docs/CI_VERIFICATION.md`, `README.md` (integration/chaos entrypoints).
