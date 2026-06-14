# L-84ZN — Rollback plan

**Verdict:** `CORE10-L84ZN-VERDICT-001: STRIPE_WEBHOOK_PRE_SIGNATURE_AUDIT_WRITE_BOUNDARY_PROVEN_LOCAL_CODE_TEST_NO_RUNTIME_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## If pre-signature audit telemetry is required again

1. Revert commit(s) on branch `fix/l84zn-stripe-webhook-pre-signature-audit-write-boundary-2026-06-14` that touch:
   - `server/handlers/slimStripeWebhookHandler.mjs`
   - `server/test/stripeWebhookAudit.test.js`
   - `server/test/l84znStripeWebhookPreSignatureAuditWriteBoundary.test.js`
2. Restore prior `recordStripeWebhookAudit` calls at route entry and signature-failure paths (see L-84ZM `CALL_ORDER` / `MUTATION_BOUNDARY_INVENTORY.md`).
3. Re-run targeted webhook test suites before redeploy.

## Risk of rollback

Re-enabling pre-signature audit writes restores **non-money DB mutation on unauthenticated webhook rejection**, blocking safe live negative POST probes (L-84ZL/W1 rationale).

## Deploy note

This gate does **not** include redeploy. Rollback in production requires normal merge + deploy operator approval.

---

*End.*
