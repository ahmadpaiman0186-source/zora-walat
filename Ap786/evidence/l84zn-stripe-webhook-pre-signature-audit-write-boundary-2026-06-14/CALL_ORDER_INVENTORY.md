# L-84ZN — Call-order inventory

**Verdict:** `CORE10-L84ZN-VERDICT-001: STRIPE_WEBHOOK_PRE_SIGNATURE_AUDIT_WRITE_BOUNDARY_PROVEN_LOCAL_CODE_TEST_NO_RUNTIME_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## Root bridge — `api/webhooks/stripe.mjs`

| Step | Code path | Condition | Side effect possible? | Decision |
|------|-----------|-----------|----------------------|----------|
| 1 | `handler` | `req.method !== 'POST'` | **No** audit (405 before import) | **405** — no DB write |
| 2 | `handleSlimStripeWebhookPost` | POST | See slim handler | Delegates |

## Slim handler — `handleSlimStripeWebhookPost` (post-L-84ZN)

| Step | Code path | Condition | Audit write? | Payment/provider? | Decision |
|------|-----------|-----------|--------------|-------------------|----------|
| 1 | `logWebhookSlimBreadcrumb` | always | **No** (console) | No | OK |
| 2 | `logStripeWebhookLifecycle` | always | **No** (console) | No | OK |
| 3 | `primeSlimServerlessEnv` | non-production | No | No | OK |
| 4 | signing secret check | not `whsec_*` | **No** (was audit — **removed**) | No | **503** |
| 5 | missing `stripe-signature` | header absent | **No** (was audit — **removed**) | No | **400** / **413** |
| 6 | `readBoundedWebhookBody` | has signature | No | No | OK |
| 7 | `Stripe.webhooks.constructEvent` | has signature | No until success | No | OK |
| 8 | invalid signature | constructEvent throws | **No** (was audit — **removed**) | No | **400** |
| 9 | `recordStripeWebhookAudit` | **after verified event** | **Yes** (verified telemetry) | No yet | OK |
| 10 | slim processors / `getHandler` | verified + matched event | Audit + money path | **Only after step 9** | OK |

## Pre-L-84ZN vs post-L-84ZN

| Trigger | Pre-L-84ZN audit? | Post-L-84ZN audit? |
|---------|-------------------|-------------------|
| Route entry | **Yes** (`route_entry`) | **No** |
| Missing signature | **Yes** | **No** |
| Invalid signature | **Yes** | **No** |
| Secret not configured | **Yes** | **No** |
| Verified signature | Yes | Yes |

## `recordStripeWebhookAudit` specifically

| When | Before L-84ZN | After L-84ZN |
|------|---------------|--------------|
| Before method check (root bridge) | N/A (405 first) | N/A |
| Before Stripe-Signature check | **Yes** | **No** |
| Before `constructEvent` | **Yes** | **No** |
| On missing signature | **Yes** | **No** |
| On invalid signature | **Yes** | **No** |
| Only after valid signature | Yes | Yes |

---

*End.*
